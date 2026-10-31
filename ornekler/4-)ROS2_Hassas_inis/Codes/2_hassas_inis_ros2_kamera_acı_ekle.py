import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy, DurabilityPolicy
from sensor_msgs.msg import Image
from cv_bridge import CvBridge
import cv2
import numpy as np
import time

from px4_msgs.msg import OffboardControlMode, TrajectorySetpoint, VehicleCommand, VehicleStatus

class PrecisionLandingNode(Node):
    def __init__(self):
        super().__init__('precision_landing_node')
        self.bridge = CvBridge()
        
        # Kamera Kalibrasyon
        self.camera_matrix = np.array([[410.93925, 0.0, 640.0], [0.0, 410.93926, 360.0], [0.0, 0.0, 1.0]], dtype=np.float32)
        self.dist_coeffs = np.zeros((5, 1))
        
        # ArUco Tanımlama
        self.marker_size = 1.0 
        self.obj_points = np.array([[-0.5, 0.5, 0], [0.5, 0.5, 0], [0.5, -0.5, 0], [-0.5, -0.5, 0]], dtype=np.float32)
        self.dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
        self.detector = cv2.aruco.ArucoDetector(self.dictionary, cv2.aruco.DetectorParameters())

        # Kontrol Kazançları
        self.P_gain = 0.7         
        self.descend_speed = 0.3  
        self.land_alt = 1.3
        
        # Bekleme ve Durum Ayarları
        self.offboard_start_time = None
        self.alignment_duration = 5.0 
        self.alignment_done = False
        self.is_landing_initiated = False # Döngüyü kırmak için yeni bayrak
        
        qos = QoSProfile(reliability=ReliabilityPolicy.BEST_EFFORT, durability=DurabilityPolicy.TRANSIENT_LOCAL, history=HistoryPolicy.KEEP_LAST, depth=1)

        self.offboard_mode_pub = self.create_publisher(OffboardControlMode, '/fmu/in/offboard_control_mode', qos)
        self.trajectory_pub = self.create_publisher(TrajectorySetpoint, '/fmu/in/trajectory_setpoint', qos)
        self.command_pub = self.create_publisher(VehicleCommand, '/fmu/in/vehicle_command', qos)
        
        self.status_sub = self.create_subscription(VehicleStatus, '/fmu/out/vehicle_status_v1', self.status_cb, qos)
        self.image_sub = self.create_subscription(Image, '/camera/image_0', self.image_cb, 10)

        self.nav_state = None
        self.marker_found = False
        self.error_x, self.error_y, self.error_z = 0.0, 0.0, 0.0
        
        self.timer = self.create_timer(0.05, self.run_loop)
        self.get_logger().info("Sistem Hazır. İniş yapıldıktan sonra döngüye girmeyecek.")

    def status_cb(self, msg):
        self.nav_state = msg.nav_state
        # Eğer manuel olarak Takeoff yapılırsa veya sistem resetlenirse iniş bayrağını sıfırla
        if self.nav_state in [2, 17]: # Takeoff veya Offboard başlangıcı gibi durumlar
             if self.is_landing_initiated and self.nav_state == 17:
                 self.is_landing_initiated = False

    def image_cb(self, msg):
        try:
            frame = self.bridge.imgmsg_to_cv2(msg, 'bgr8')
            corners, ids, _ = self.detector.detectMarkers(frame)
            if ids is not None:
                success, rvec, tvec = cv2.solvePnP(self.obj_points, corners[0], self.camera_matrix, self.dist_coeffs)
                if success:
                    self.marker_found = True
                    self.error_x, self.error_y, self.error_z = tvec.flatten()
                    
                    cv2.rectangle(frame, (10, 10), (300, 130), (0, 0, 0), -1)
                    cv2.putText(frame, f"X Err: {self.error_x:+.2f} m", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                    cv2.putText(frame, f"Y Err: {self.error_y:+.2f} m", (20, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                    cv2.putText(frame, f"Z Alt: {self.error_z:.2f} m", (20, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
                    cv2.aruco.drawDetectedMarkers(frame, corners, ids)
            else:
                self.marker_found = False
            cv2.imshow("Precision Landing", frame)
            cv2.waitKey(1)
        except Exception as e:
            self.get_logger().error(f"Görüntü hatası: {e}")

    def run_loop(self):
        # Eğer iniş emri verildiyse Offboard döngüsünü çalıştırma
        if self.is_landing_initiated:
            return

        offboard_msg = OffboardControlMode()
        offboard_msg.position, offboard_msg.velocity = False, True
        offboard_msg.timestamp = int(self.get_clock().now().nanoseconds / 1000)
        self.offboard_mode_pub.publish(offboard_msg)

        is_offboard = self.nav_state in [14, 17]

        if self.marker_found:
            if not is_offboard:
                self.send_command(VehicleCommand.VEHICLE_CMD_DO_SET_MODE, 1.0, 6.0)
                self.offboard_start_time = None
                return

            if self.offboard_start_time is None:
                self.offboard_start_time = time.time()

            elapsed = time.time() - self.offboard_start_time

            if elapsed < self.alignment_duration:
                self.publish_alignment_pose()
            else:
                self.publish_velocity()
        else:
            self.publish_zero_velocity()
            self.offboard_start_time = None

    def publish_alignment_pose(self):
        msg = TrajectorySetpoint()
        msg.position, msg.velocity = [float('nan')]*3, [0.0, 0.0, 0.0]
        msg.yaw = 0.0
        msg.timestamp = int(self.get_clock().now().nanoseconds / 1000)
        self.trajectory_pub.publish(msg)

    def publish_velocity(self):
        msg = TrajectorySetpoint()
        msg.position, msg.yaw = [float('nan')] * 3, 0.0
        
        vx, vy = -self.error_y * self.P_gain, self.error_x * self.P_gain
        msg.velocity = [float(np.clip(vx, -1.5, 1.5)), float(np.clip(vy, -1.5, 1.5)), float(self.descend_speed)]
        msg.timestamp = int(self.get_clock().now().nanoseconds / 1000)
        self.trajectory_pub.publish(msg)

        if self.error_z < self.land_alt:
            self.get_logger().info("İniş kriteri sağlandı! Land moduna geçiliyor.")
            self.is_landing_initiated = True # DÖNGÜYÜ BURADA KIRIYORUZ
            self.send_command(VehicleCommand.VEHICLE_CMD_NAV_LAND)

    def publish_zero_velocity(self):
        msg = TrajectorySetpoint()
        msg.position, msg.velocity, msg.yaw = [float('nan')]*3, [0.0, 0.0, 0.0], 0.0
        msg.timestamp = int(self.get_clock().now().nanoseconds / 1000)
        self.trajectory_pub.publish(msg)

    def send_command(self, command, p1=0.0, p2=0.0):
        msg = VehicleCommand()
        msg.command, msg.param1, msg.param2 = command, p1, p2
        msg.target_system, msg.target_component = 1, 1
        msg.source_system, msg.source_component = 1, 1
        msg.from_external = True
        msg.timestamp = int(self.get_clock().now().nanoseconds / 1000)
        self.command_pub.publish(msg)

def main():
    rclpy.init()
    node = PrecisionLandingNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt: pass
    finally:
        cv2.destroyAllWindows()
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
