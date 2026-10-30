// Kurgusal eğitim kataloğu. Hiçbir tablo gerçek ürün ölçümü değildir.
export const FRAMES = [
  {id:'q7',type:'quad',name:'Explorer 7',label:'Quadcopter · 7 inç',rotors:4,size:7,mass:205,mounts:[16,19],span:.34,description:'Dört motorlu kompakt X gövde.',pros:'Dört motor/ESC ile daha az parça, daha düşük gövde kütlesi ve daha kolay kurulum.',cons:'Yük, pervane açıklığı ve itki rezervi sınırlıdır. Motor arızasında uçuşu sürdürme garantisi yoktur.'},
  {id:'q10',type:'quad',name:'Carrier 10',label:'Quadcopter · 10 inç',rotors:4,size:10,mass:395,mounts:[19,25],span:.49,description:'Dört motorlu, daha büyük pervane ve aviyonik alanı.',pros:'7 inçe göre daha büyük pervane ve geniş iç yerleşim alanı sunar.',cons:'Büyüklük ve gövde kütlesi artar; daha büyük motor/batarya ihtiyacı doğabilir.'},
  {id:'h10',type:'quad',name:'Hexacopter 10',label:'Hexacopter · 10 inç',rotors:6,size:10,mass:595,mounts:[19,25],span:.70,description:'Tek düzlemde altı kol ve altı motor; koaksiyel düzen değildir.',pros:'Yük altı motora dağılır; aynı güç grubunda toplam statik itki ve disk alanı artar.',cons:'Altı motor, ESC ve pervane gerekir. Kütle, kablolama ve tam gaz akımı artar. Arıza toleransı yeterli itki ve uygun kontrolcüye bağlıdır; burada arıza uçuşu simüle edilmez.'},
  {id:'o10',type:'quad',name:'Octocopter 10',label:'Octocopter · 10 inç',rotors:8,size:10,mass:825,mounts:[19,25],span:.86,description:'Tek düzlemde sekiz kol ve sekiz motor; X8 koaksiyel değildir.',pros:'Sekiz motorla yük paylaşımı ve toplam statik itki seçeneklerini karşılaştırabilirsin.',cons:'En çok parça, alan ve kablo gerektirir. Daha fazla motor otomatik olarak daha uzun süre veya güvenli arıza uçuşu anlamına gelmez.'},
  {id:'p120',type:'plane',name:'Scout 1200',label:'Scout · hafif gövde kiti',size:10,mass:620,mounts:[19,25],span:1.2,area:24,cruise:95,description:'Kapağı açık hafif gövde; kanat ölçüsü ve kuyruk tipi mekanik bölümünden seçilir.'},
  {id:'p160',type:'plane',name:'Survey 1600',label:'Survey · geniş gövde kiti',size:12,mass:990,mounts:[25],span:1.6,area:36,cruise:140,description:'Daha geniş elektronik bölmeli gövde; kanat ve itki düzenini kendin oluştur.'}
];
export const MOTORS = [
  {id:'m2306',name:'2306 · 1750 KV',mass:37,minS:4,maxS:6,nominal:6,mount:16,minProp:6,maxProp:7,diameter:28,height:17,refProp:7,thrust:1120,power:410,rpm:25000,types:['quad'],color:0xc96a3b},
  {id:'m2806',name:'2806.5 · 1300 KV',mass:69,minS:4,maxS:6,nominal:6,mount:19,minProp:7,maxProp:8,diameter:34,height:21,refProp:7,thrust:1580,power:500,rpm:20500,types:['quad'],color:0x537c78},
  {id:'m2812',name:'2812 · 900 KV',mass:102,minS:4,maxS:6,nominal:6,mount:19,minProp:9,maxProp:10,diameter:35,height:27,refProp:10,thrust:2350,power:720,rpm:13900,types:['quad'],color:0xb38d42},
  {id:'m3115',name:'3115 · 900 KV',mass:138,minS:4,maxS:6,nominal:6,mount:25,minProp:9,maxProp:10,diameter:40,height:31,refProp:10,thrust:2900,power:910,rpm:14700,types:['quad'],color:0x5d637b},
  {id:'m2814',name:'2814 · 1000 KV',mass:112,minS:3,maxS:4,nominal:4,mount:19,minProp:9,maxProp:10,diameter:35,height:31,refProp:10,thrust:1570,power:390,rpm:11200,types:['plane'],color:0xc46c40},
  {id:'m3520',name:'3520 · 700 KV',mass:184,minS:4,maxS:6,nominal:6,mount:25,minProp:10,maxProp:12,diameter:43,height:38,refProp:12,thrust:3100,power:850,rpm:10400,types:['plane'],color:0x537c78}
];
export const ESCS=[
  {id:'e30',name:'30 A · 2–4S PWM',mass:27,minS:2,maxS:4,amps:30,width:16,length:35},
  {id:'e45',name:'45 A · 3–6S PWM',mass:37,minS:3,maxS:6,amps:45,width:20,length:43},
  {id:'e60',name:'60 A · 3–6S PWM',mass:48,minS:3,maxS:6,amps:60,width:24,length:51}
];
export const PROPS=[
  {id:'p74',name:'7 × 4 · 2 kanat',diameter:7,pitch:4,blades:2,mass:9},
  {id:'p743',name:'7 × 4 · 3 kanat',diameter:7,pitch:4,blades:3,mass:13},
  {id:'p1045',name:'10 × 4.5 · 2 kanat',diameter:10,pitch:4.5,blades:2,mass:16},
  {id:'p1053',name:'10 × 5 · 3 kanat',diameter:10,pitch:5,blades:3,mass:23},
  {id:'p126',name:'12 × 6 · 2 kanat',diameter:12,pitch:6,blades:2,mass:25}
];
export const MATERIALS=[
  {id:'pc',name:'PC / plastik',mass:1,color:0x738877},
  {id:'cf',name:'Karbon kompozit',mass:.88,color:0x303833},
  {id:'abs',name:'ABS · prototip',mass:1.12,color:0xe2b359}
];
export const BATTERIES=[
  {id:'b4s22',name:'4S · 2200 mAh · 35C',s:4,ah:2.2,c:35,mass:245,length:105,width:34,height:31},
  {id:'b4s50',name:'4S · 5000 mAh · 25C',s:4,ah:5,c:25,mass:505,length:135,width:42,height:43},
  {id:'b6s22',name:'6S · 2200 mAh · 35C',s:6,ah:2.2,c:35,mass:365,length:112,width:36,height:47},
  {id:'b6s40',name:'6S · 4000 mAh · 25C',s:6,ah:4,c:25,mass:575,length:140,width:45,height:50},
  {id:'b6s80h',name:'6S · 8000 mAh · 40C',s:6,ah:8,c:40,mass:1120,length:175,width:61,height:57},
  {id:'b6s80',name:'6S · 8000 mAh · 25C',s:6,ah:8,c:25,mass:1040,length:175,width:61,height:57}
];
export const CONTROLLERS=[{id:'pix',name:'Pixhawk · PWM örneği',mass:39,power:2.8,width:51,length:58,height:16},{id:'mini',name:'Pixhawk Mini · PWM',mass:22,power:2.4,width:35,length:40,height:13}];
// Taşıyıcı, soğutucu ve regülatör dahil yaklaşık eğitim ayak izleri; ürün teknik çizimi değildir.
export const COMPUTERS=[
  {id:'nano',name:'Jetson Nano · kompakt taşıyıcı',mass:140,power:10,width:85,length:65,height:27,color:0x3c805b,description:'Küçük taşıyıcı, soğutucu ve ayrı 5 V regülatörle örnek kurulum.'},
  {id:'orin',name:'Jetson Orin Nano · geniş taşıyıcı',mass:195,power:18,width:100,length:79,height:36,color:0x458463,description:'Daha geniş taşıyıcı ve soğutucu; 10 inç gövdede ayrılmış montaj alanı.'}
];
export const EXTRAS=[
  {id:'gps',name:'GPS + pusula',mass:29,power:.8},
  {id:'telemetry',name:'Telemetri',mass:22,power:1.5},
  {id:'camera',name:'Kamera',mass:46,power:3}
];
// PX4 Quad X için bu atölyede sabitlenmiş MAIN ataması; burun -Z yönündedir.
export const MOTOR_LAYOUT=[{id:1,x:1,z:-1,name:'Sağ ön',direction:-1},{id:2,x:-1,z:1,name:'Sol arka',direction:-1},{id:3,x:-1,z:-1,name:'Sol ön',direction:1},{id:4,x:1,z:1,name:'Sağ arka',direction:1}];
export const FACES=[{id:'bottom',name:'Düz',axis:[0,1,0]},{id:'top',name:'Ters',axis:[0,-1,0]},{id:'left',name:'Sol yan',axis:[1,0,0]},{id:'right',name:'Sağ yan',axis:[-1,0,0]},{id:'nose',name:'Burun aşağı',axis:[0,0,-1]},{id:'tail',name:'Burun yukarı',axis:[0,0,1]}];
export const TIPS={
 frame:{title:'Gövdeyi seçerken',html:'<p><strong>7 veya 10 inç, burada izin verilen en büyük pervane çapıdır.</strong> Quadcopter 4, hexacopter 6, octocopter 8 motor kullanır. Motor aralığı ve kol düzeni de önemlidir.</p><ul><li>Büyük pervane için gövdede boşluk ve uygun motor gerekir.</li><li>Motor sayısı arttıkça motor/ESC/pervane sayısı ve gövde kütlesi artar; süre her zaman uzamaz.</li><li>Motor montaj delikleri ve gövdenin taşıyabileceği yükü karşılaştır.</li><li>Sabit kanatta kanat alanını ve ağırlık merkezini değerlendir; yalnız kanat açıklığı yeterli değildir.</li><li>Hafif gövde süreyi artırabilir; rijitlik ve titreşim de önemlidir.</li></ul>'},
 motor:{title:'Motoru seçerken',html:'<p><strong>KV, boşta volt başına yaklaşık devir eğilimidir; güç veya verim puanı değildir.</strong> Stator boyutu, pervane ve gerilim birlikte düşünülür.</p><ul><li>6S önerilen bir motorun yanında 4S sınırındaki ESC kullanıp 6S batarya bağlamak ESC sınırını aşar.</li><li>“6S motor” her zaman yalnız 6S çalışır demek değildir. Desteklenen gerilim aralığını ve hangi pervaneyle test edildiğini oku.</li><li>2306 / 2806.5: stator çapı ve yüksekliği; dış ölçü değildir.</li><li>Güç panelindeki örnek itki tablosunu yük ve ESC akımıyla karşılaştır.</li></ul>'},
 esc:{title:'ESC’yi seçerken',html:'<p><strong>Önce hücre sayısı, sonra akım.</strong> 4S LiPo tam doluyken 16,8 V, 6S ise 25,2 V olur. 6S batarya, en fazla 4S destekleyen ESC’ye uygun değildir.</p><ul><li>Etiketteki sürekli akımı, seçili motor–pervanenin maksimum akımına pay bırakarak karşılaştır.</li><li>PWM kablosu güç taşımaz: sinyal ve ortak GND gerekir. Motorun gücü bataryadan ESC’ye gelir.</li><li>PWM kanalını değiştirmek motorun yerini/eşleşmesini değiştirir; dönüş yönünü değiştirmez.</li><li>Bu atölyede yönü “iki fazı değiştir” ile terslersin. Gerçekte bazı ESC’lerde yazılım ayarı da bulunur.</li></ul>'},
 prop:{title:'Pervaneyi seçerken',html:'<p><strong>Çap × hatve ve kanat sayısı birlikte etkilidir.</strong> Büyük çap ve daha fazla kanat, motor üzerindeki yükü ve gerekli akımı değiştirebilir.</p><ul><li>Gövde açıklığına, motor önerisine ve izin verilen devre bak.</li><li><strong>PC / plastik:</strong> uygun maliyetli ve görece esnek; çatlak ve deformasyon kontrolü gerekir. Her plastik aynı değildir; naylon ve takviyeli türler de kullanılır.</li><li><strong>Karbon kompozit:</strong> daha rijit olabilir; pahalıdır ve hasar değerlendirmesi önemlidir. Sırf karbon olduğu için daha verimli sayılmaz.</li><li><strong>ABS:</strong> burada yalnız prototip örneğidir. Malzeme adı veya 3B baskının şekli, yüksek devir dayanımını kanıtlamaz. Bu seçenekle sanal uçuş engellenir.</li><li>CW/CCW pervane yönü, motorun dönüşüyle eşleşmelidir.</li></ul>'},
 battery:{title:'Bataryayı seçerken',html:'<p><strong>S = seri hücre sayısı; mAh = kapasite.</strong> LiPo için burada nominal 3,7 V/hücre ve tam dolu 4,2 V/hücre kullanılır.</p><ul><li>Enerji (Wh) = nominal V × Ah.</li><li>Katalogdaki teorik akım sınırı = Ah × C. Gerçek pakette yaş, sıcaklık ve üretici ölçümleri de etkilidir.</li><li>Büyük batarya daha ağırdır. Süre her zaman kapasiteyle aynı oranda artmaz.</li><li>Rezerv bırakarak hesapla. Bu atölyenin başlangıç rezervi %20’dir.</li><li>Ağırlık merkezini görmek için Güç sekmesinden batarya konumunu değiştir.</li></ul>'},
 fc:{title:'Uçuş kontrolcüsünü seçerken',html:'<p><strong>Port etiketi ile yazılım ataması farklı şeylerdir.</strong> Motor testiyle hangi fiziksel motorun hangi çıkışa bağlı olduğunu gözlemle.</p><ul><li>Buradaki Pixhawk, basitleştirilmiş bir PWM eğitim modelidir; belirli bir kartın pin şeması değildir.</li><li>Sinyal ve GND uçlarını kontrol et; batarya gerilimini sinyal pinine bağlama.</li><li>Montaj yönü ve titreşim yalıtımı sensörler için önemlidir.</li><li>Kart değiştirildiğinde atölyedeki sensör kalibrasyonları sıfırlanır.</li></ul>'},
 extras:{title:'Ek aviyonik eklerken',html:'<p><strong>Her ilavenin hem kütlesi hem tüketimi var.</strong> Kamerayı ve görev bilgisayarını ekleyip süreyi tekrar gözlemle.</p><ul><li>Güç kaynağının uygun çıkış gerilimini ve akımını kontrol et.</li><li>GPS/pusula yerleşiminde yüksek akım kablolarından ve manyetik parazitten uzaklık önemlidir.</li><li>Sabit kanatta ek yükün konumu ağırlık merkezini değiştirir.</li><li>Ek aviyonikler bu sürümde tak–çıkar olarak modellenir; port protokolleri ayrıca simüle edilmez.</li></ul>'}
};

TIPS.computer={title:'Jetson yerleşimi ve bağlantısı',html:'<p><strong>Jetson görev bilgisayarı, Pixhawk otopilottur.</strong> Birlikte çalışırlar; görev bilgisayarı uçuş kontrolcüsünün yerini almaz.</p><ul><li>Kompakt taşıyıcı 85 × 65 mm; geniş taşıyıcı 100 × 79 mm eğitim ayak izi kullanır. Geniş model 7 inç tezgâhın ayrılmış alanına sığmaz.</li><li>Jetson ayrı taşıyıcı ve standoff ile üst tablanın arka bölümüne oturur. Pixhawk önde kalır; pil alt tablaya kayışla bağlanır.</li><li>Jetson regüle besleme ister. UART sinyal hattı bir güç girişi değildir.</li><li>TELEM2 bağlantısında TX ile RX karşılıklı, GND ortak bağlanır. Kablolar seçildiğinde oluşumunu izleyebilirsin.</li><li>Verilen ölçü ve tüketimler yaklaşık yerleşim örneğidir; gerçek taşıyıcı ve soğutucu değiştikçe ölçüler değişir.</li></ul>'};
