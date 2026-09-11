'use strict';
const icons={home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',box:'m3 7 9-4 9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M12 11v10M7 5l10 4',cart:'M3 3h2l3 12h10l3-9H6M9 20h.01M18 20h.01',receipt:'M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm4 5h6M9 12h6M9 16h3',grid:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',chevron:'m9 5 7 7-7 7',down:'m6 9 6 6 6-6',back:'m12 5-7 7 7 7M5 12h15',close:'m6 6 12 12M6 18 18 6',plus:'M12 5v14M5 12h14',minus:'M5 12h14',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',camera:'M4 6h4l2-3h4l2 3h4v14H4zM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',scan:'M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 7v10M10 7v10M14 7v10M17 7v10',keyboard:'M3 5h18v14H3zM7 9h.01M11 9h.01M15 9h.01M18 9h.01M7 13h.01M11 13h.01M15 13h.01M7 16h10',truck:'M2 5h13v12H2zM15 9h4l3 4v4h-7M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0M20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0',chart:'M4 3v18h17M8 15V9M13 15V5M18 15v-4',wallet:'M3 5h17v15H3zM3 5V3h14M15 10h6v5h-6z',store:'M3 9h18l-2-6H5L3 9Zm1 0v12h16V9M9 21v-7h6v7M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0',bell:'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3Zm5 3h4',user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3a8 8 0 0 1 16 0v3',check:'m5 12 4 4L19 6',alert:'m12 3 10 18H2L12 3Zm0 6v5M12 17h.01',up:'m5 15 5-5 4 3 5-8M14 5h5v5',filter:'M4 6h16M7 12h10M10 18h4',edit:'m15 3 6 6L9 21H3v-6L15 3Zm-3 3 6 6',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',image:'M3 3h18v18H3zM3 17l5-6 5 5 3-3 5 5M16 7h.01',shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',refresh:'M20 8a8 8 0 1 0 0 8M20 3v5h-5',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2',dots:'M5 12h.01M12 12h.01M19 12h.01',tag:'m3 3 9 .1 9 9-9 9-9-9V3Zm5 5h.01',users:'M10 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M1 20v-3a6 6 0 0 1 12 0v3M15 4a3 3 0 0 1 0 6M16 14a5 5 0 0 1 5 5v1'};
function ic(name){
return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(icons[name]||icons.box)+'"/></svg>'
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'Rp'+Number(n).toLocaleString('id-ID');
const products=[
{id:1,name:'Minyak Goreng Sania 1 L',short:'SANIA',sku:'MNY-001',barcode:'8993496101010',cat:'Sembako',price:18500,cost:16000,stock:24,min:10,unit:'Pcs',color:'#eaca76'},
{id:2,name:'Indomie Goreng Original',short:'INDO',sku:'MIE-001',barcode:'089686170726',cat:'Makanan',price:3500,cost:2800,stock:8,min:12,unit:'Pcs',color:'#dfb98d'},
{id:3,name:'Susu UHT Ultra 250 ml',short:'ULTRA',sku:'SSU-001',barcode:'8998009010101',cat:'Minuman',price:6500,cost:5200,stock:32,min:10,unit:'Pcs',color:'#afc8da'},
{id:4,name:'Gula Pasir Gulaku 1 kg',short:'GULA',sku:'GLA-001',barcode:'8993100100016',cat:'Sembako',price:17500,cost:15000,stock:5,min:10,unit:'Pcs',color:'#e1c988'},
{id:5,name:'Kopi Kapal Api 65 g',short:'KOPI',sku:'KPI-001',barcode:'8991002100012',cat:'Minuman',price:7500,cost:6100,stock:18,min:8,unit:'Pcs',color:'#bb9b82'},
{id:6,name:'Sabun Lifebuoy 70 g',short:'SABUN',sku:'SBN-001',barcode:'8999999500015',cat:'Rumah tangga',price:4500,cost:3500,stock:21,min:8,unit:'Pcs',color:'#dba6a0'}
];
let route='dashboard',storeName='Toko Sumber Rezeki',storeId=1,viewState='normal',search='',category='Semua kategori',cart=[],purchaseCart=[],saleNumber='PJ-080926-024',captures=[],scanResults=[],scanPurpose='sale',processing=false,stream=null,scanGeneration=0,dialogStep='',opname={},referenceExtra={},notificationsRead=false,activeProduct=null,theme='#ee4d2d',savedDrafts=0,salesFilter='Hari ini';
const names={dashboard:'Beranda',products:'Produk',categories:'Kategori produk',units:'Satuan',suppliers:'Supplier',accounts:'Akun keuangan',pos:'Kasir penjualan',sales:'Transaksi',sale:'Detail transaksi',return:'Retur penjualan',purchasing:'Pembelian',expenses:'Biaya toko',inventory:'Persediaan',cash:'Kas & bank',capital:'Modal pemilik',counts:'Stok opname',count:'Hitung stok',reports:'Laporan usaha',stores:'Toko & anggota','store-create':'Buat toko',store:'Pengaturan toko',profile:'Pengaturan akun',security:'Keamanan',appearance:'Tampilan',subscription:'Paket & langganan','product-new':'Tambah produk',drafts:'Draf produk'};
const purposes={sale:['Penjualan','Masukkan barang ke keranjang','cart'],purchase:['Pembelian','Catat barang yang dibeli dari supplier','truck'],stock:['Cek stok','Temukan produk dan lihat persediaan','box'],product:['Tambah produk','Siapkan produk baru untuk katalog','plus']};
const $=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
function button(label,action,cls='',icon=''){
return '<button class="btn '+cls+'" data-action="'+action+'">'+(icon?ic(icon):'')+label+'</button>'
}
function link(label,target,cls='',icon=''){
return '<a class="btn '+cls+'" href="#'+target+'">'+(icon?ic(icon):'')+label+'</a>'
}
function badge(label,kind=''){
return '<span class="badge '+kind+'">'+label+'</span>'
}
function thumb(p,large=false,src=''){
return '<div class="product-thumb'+(large?' large':'')+'" style="--pack:'+esc(p?.color||'#dad6cc')+'">'+(src?'<img src="'+esc(src)+'" alt="'+esc(p?.name||'Foto pilihan')+'">':'<span class="pack" aria-hidden="true">'+esc(p?.short||'?')+'</span>')+'</div>'
}
function head(title,description='',actions='',back=''){
return (back?'<a class="back" href="#'+back+'">'+ic('back')+esc(names[back]||'Kembali')+'</a>':'')+'<header class="page-head"><div><h1>'+title+'</h1>'+(description?'<p>'+description+'</p>':'')+'</div>'+(actions?'<div class="head-actions">'+actions+'</div>':'')+'</header>'
}
function section(title,body,action=''){
return '<section class="section">'+(title?'<div class="section-head"><h2>'+title+'</h2>'+action+'</div>':'')+body+'</section>'
}
function field(label,name,value='',type='text',full=false,required=false){
return '<div class="form-field'+(full?' full':'')+'"><label for="'+name+'">'+label+(required?' <span class="required">*</span>':'')+'</label><input id="'+name+'" name="'+name+'" type="'+type+'" value="'+esc(value)+'"'+(required?' required':'')+(type==='number'?' min="0" step="any" inputmode="decimal"':'')+'></div>'
}
function selectField(label,name,opts){
return '<div class="form-field"><label for="'+name+'">'+label+'</label><select id="'+name+'" name="'+name+'">'+opts.map(o=>'<option>'+o+'</option>').join('')+'</select></div>'
}
function summary(label,value,note,up=false){
return '<div class="summary"><small>'+label+'</small><span class="amount">'+value+'</span><span class="'+(up?'trend':'meta')+'">'+(up?ic('up'):'')+note+'</span></div>'
}
function row(title,sub,end,icon='box'){
return '<div class="row">'+ic(icon)+'<div class="row-content"><strong>'+title+'</strong><small>'+sub+'</small></div><div class="row-end">'+end+'</div></div>'
}
function nav(){
const current=route==='pos'?'cashier':route==='dashboard'?'dashboard':['products','product-new','drafts','categories','units'].includes(route)?'products':['sales','sale','return'].includes(route)?'sales':'more';

return '<nav class="bottom-nav" aria-label="Navigasi utama"><div class="bottom-nav-inner">'+[['Beranda','dashboard','home'],['Produk','products','box'],['Kasir','cashier','cart'],['Transaksi','sales','receipt'],['Lainnya','more','grid']].map(([label,key,icon])=>key==='cashier'?'<button class="nav-item cashier-trigger" data-action="cashier" aria-label="Buka pusat Kasir"><span class="cashier-box">'+ic(icon)+'</span><span>'+label+'</span></button>':key==='more'?'<button class="nav-item '+(current===key?'active':'')+'" data-action="more" aria-haspopup="dialog" aria-expanded="false">'+ic(icon)+'<span>'+label+'</span></button>':'<a href="#'+key+'" class="nav-item '+(current===key?'active':'')+'"'+(current===key?' aria-current="page"':'')+'>'+ic(icon)+'<span>'+label+'</span></a>').join('')+'</div></nav>'
}
function render(){
route=location.hash.slice(1).split('?')[0]||'dashboard';

if(!names[route]){
route='dashboard';
}

document.title=(names[route]||'Sisko Plan')+' · Sisko Plan';$('#app').innerHTML='<header class="topbar"><div class="top-inner"><a href="#dashboard" class="wordmark"><span class="brand-mark">'+ic('store')+'</span>Sisko Plan</a><button class="store-control" data-action="stores-switch" aria-label="Pilih toko aktif">'+ic('store')+'<span>'+esc(storeName)+'</span>'+ic('down')+'</button><div class="top-actions"><button class="icon-btn locale" data-action="language" aria-label="Pilihan bahasa">ID</button><button class="icon-btn '+(!notificationsRead?'bell':'')+'" data-action="notifications" aria-label="Buka notifikasi">'+ic('bell')+'</button><button class="icon-btn avatar" data-action="profile-menu" aria-label="Buka menu akun">DR</button></div></div></header><main class="main '+(route==='pos'?'wide':'')+'" id="main">'+page()+'</main>'+nav();bindPage()
}
function page(){
switch(route){
case'dashboard':return dashboard();case'products':return productPage();case'product-new':return productForm();case'drafts':return draftsPage();case'pos':return posPage();case'sales':return salesPage();case'sale':return salePage();case'return':return returnPage();case'purchasing':return purchasing();case'inventory':return inventory();case'reports':return reports();case'counts':return counts();case'count':return countPage();case'cash':return cashPage();case'capital':return capitalPage();case'expenses':return expensesPage();case'stores':return storesPage();case'store-create':return storeForm();case'store':return storePage();case'profile':return profilePage();case'security':return securityPage();case'appearance':return appearancePage();case'subscription':return subscriptionPage();default:return referencePage()
}
}
function stateContent(noun,action){
if(viewState==='normal'){
return '';
}

if(viewState==='loading'){
return section('',Array.from({length:5},()=>'<div class="loading-row"><div class="skeleton"></div><div class="skeleton"></div></div>').join('')+'<p class="pending-text" role="status">Memuat '+noun+'…</p>');
}

if(viewState==='error'){
return section('','<div class="empty">'+ic('alert')+'<h2>'+noun+' belum berhasil dimuat</h2><p>Data sebelumnya tidak berubah. Coba muat kembali.</p>'+button('Coba lagi','retry-state','primary','refresh')+'</div>');
}

return section('','<div class="empty">'+ic('box')+'<h2>Belum ada '+noun.toLowerCase()+'</h2><p>Mulai dengan satu catatan. Informasinya akan muncul di sini.</p>'+action+'</div>')
}
function dashboard(){
const state=stateContent('Ringkasan usaha',button('Mulai penjualan','task:sale','primary','cart'));

return head('Ringkasan bisnis','Selasa, 8 September 2026',button('Buka kasir','cashier','primary','cart'))+(state||'<div class="summary-strip">'+summary('Penjualan bersih',money(1248500),'12,4% dari kemarin',true)+summary('Transaksi','24','Rata-rata '+money(52021))+summary('Laba kotor',money(286500),'Dari penjualan hari ini')+summary('Kas & bank',money(5825000),'Saldo seluruh akun')+'</div><div class="attention">'+ic('alert')+'<p><strong>2 produk hampir habis.</strong> Periksa sebelum stok kosong.</p>'+link('Lihat stok','inventory','', 'chevron')+'</div><div class="split"><div class="stack">'+section('Penjualan 7 hari terakhir','<div class="chart" role="img" aria-label="Penjualan tujuh hari: 680 ribu, 920 ribu, 810 ribu, 1,1 juta, 960 ribu, 1,11 juta, 1,25 juta">'+[55,74,65,88,77,89,100].map((h,i)=>'<div class="chart-col"><span class="chart-value">'+['680','920','810','1.100','960','1.110','1.248'][i]+'</span><div class="chart-bar" style="height:'+h+'%"></div><span class="chart-label">'+['Rab','Kam','Jum','Sab','Min','Sen','Sel'][i]+'</span></div>').join('')+'</div><div class="chart-caption"><span>Dalam ribuan rupiah</span><span>Total '+money(6828500)+'</span></div>',link('Laporan','reports','subtle','chevron'))+section('Transaksi terbaru',salesRows(3),link('Lihat semua','sales','subtle','chevron'))+'</div><div class="stack">'+section('Perlu perhatian',products.filter(p=>p.stock<p.min).map(p=>'<a class="row" href="#inventory">'+thumb(p)+'<div class="row-content"><strong>'+p.name+'</strong><small>Batas minimum '+p.min+' '+p.unit.toLowerCase()+'</small></div><div class="row-end">'+badge('Sisa '+p.stock,'warn')+'</div></a>').join('')+row('Utang jatuh tempo','CV Berkah Pangan · hari ini','<strong>'+money(450000)+'</strong>','wallet'),link('Pembelian','purchasing','subtle','chevron'))+section('Pekerjaan hari ini','<div class="section-body"><a class="menu-link" href="#counts">'+ic('box')+'Lanjutkan stok opname'+ic('chevron')+'</a><a class="menu-link" href="#expenses">'+ic('wallet')+'Catat biaya toko'+ic('chevron')+'</a><a class="menu-link" href="#reports">'+ic('chart')+'Lihat kondisi usaha'+ic('chevron')+'</a></div>')+'</div></div>')
}
function productToolbar(){
return '<div class="toolbar"><div class="search">'+ic('search')+'<input id="product-search" aria-label="Cari nama produk atau barcode" placeholder="Cari nama produk atau barcode" value="'+esc(search)+'"></div><select id="category-filter" aria-label="Kategori produk">'+['Semua kategori','Sembako','Makanan','Minuman','Rumah tangga'].map(c=>'<option'+(category===c?' selected':'')+'>'+c+'</option>').join('')+'</select>'+button('Data pendukung','product-menu','','grid')+'</div>'
}
function filteredProducts(){
return products.filter(p=>(category==='Semua kategori'||p.cat===category)&&(p.name+' '+p.sku+' '+p.barcode).toLowerCase().includes(search.toLowerCase()))
}
function productPage(){
const state=stateContent('Produk',link('Tambah produk','product-new','primary','plus'));

return head('Produk','',button('Kamera','scan:product','','camera')+link('Tambah produk','product-new','primary','plus'))+(state||section('',productToolbar()+'<div id="product-results">'+productResults()+'</div>'))
}
function productResults(){
const list=filteredProducts();

return '<div class="result-caption">'+list.length+' produk'+(category!=='Semua kategori'?' · '+esc(category):'')+'</div>'+(list.length?'<div class="data-head"><span>Produk</span><span class="numeric">Harga jual</span><span class="numeric">Stok</span><span>Kategori</span><span></span></div>'+list.map(p=>'<div class="product-row"><div class="product-lead">'+thumb(p,false,p.photo)+'<div class="product-name">'+esc(p.name)+'<small>'+p.sku+' · '+p.unit+'</small></div></div><div class="numeric"><span class="cell-label">Harga jual</span>'+money(p.price)+'</div><div class="numeric stock-cell"><span class="cell-label">Stok</span>'+badge(p.stock+' '+p.unit.toLowerCase(),p.stock<p.min?'warn':'')+'</div><span class="meta category-cell">'+p.cat+'</span><button class="icon-btn" data-action="edit-product:'+p.id+'" aria-label="Edit '+esc(p.name)+'">'+ic('edit')+'</button></div>').join('')+'<div class="pagination"><small>Menampilkan '+list.length+' dari '+list.length+' produk</small><span class="badge">1</span></div>':'<div class="empty">'+ic('search')+'<h2>Produk tidak ditemukan</h2><p>Coba nama lain atau hapus filter yang dipilih.</p>'+button('Hapus pencarian & filter','clear-search','','refresh')+'</div>')
}
function productForm(){
const p=activeProduct||{};

return '<div class="form-wrap">'+head(p.id?'Edit produk':'Tambah produk','Lengkapi identitas, satuan, dan harga jual.',button('Kamera','scan:product','','camera'),'products')+'<form id="product-form" class="section"><div class="form-section"><h2>Identitas produk</h2><div class="form-grid">'+field('Nama produk','name',p.name||'','text',true,true)+field('SKU','sku',p.sku||'')+field('Barcode','barcode',p.barcode||'')+selectField('Kategori','cat',['Sembako','Makanan','Minuman','Rumah tangga'])+selectField('Satuan jual','unit',['Pcs','Kg','Liter','Dus'])+'</div></div><div class="form-section"><h2>Harga & persediaan</h2><div class="form-grid">'+field('Harga beli (Rp)','cost',p.cost||'','number',false,true)+field('Harga jual (Rp)','price',p.price||'','number',false,true)+field('Stok awal','stock',p.stock||0,'number')+field('Batas minimum stok','min',p.min||5,'number')+'</div></div><div class="form-actions">'+link('Batal','products')+'<button class="btn primary" type="submit">'+ic('check')+'Simpan produk</button></div></form><p class="prototype-note" style="margin-top:14px">Contoh form inti. Detail varian dan konversi satuan mengikuti aturan aplikasi saat implementasi.</p></div>'
}
function posPage(){
const state=stateContent('Produk',link('Tambah produk','products','primary','plus'));

return head('Kasir penjualan','Transaksi baru · '+esc(storeName),button('Kamera','scan:sale','','camera'))+'<button class="btn primary mobile-cart-jump" data-action="jump-cart"><span>'+ic('cart')+' Keranjang · '+cart.reduce((s,i)=>s+i.qty,0)+' barang</span><strong>'+money(total(cart))+'</strong></button><div class="pos-layout"><div>'+ (state||section('','<div class="toolbar"><div class="search">'+ic('search')+'<input id="pos-search" placeholder="Cari nama / scan barcode lalu Enter" aria-label="Cari produk untuk transaksi" value="'+esc(search)+'"></div></div><p class="input-hint">Ketik untuk mencari, atau fokuskan kolom lalu gunakan scanner alat.</p><div class="small-tabs">'+['Semua kategori','Sembako','Makanan','Minuman','Rumah tangga'].map(c=>'<button class="'+(category===c?'active':'')+'" data-action="pos-category:'+c+'">'+(c==='Semua kategori'?'Semua':c)+'</button>').join('')+'</div><div id="pos-results" class="pos-products">'+posResults()+'</div>'))+'</div><section class="section cart" id="cart">'+cartBody()+'</section></div>'
}
function posResults(){
const list=filteredProducts();

return list.length?list.map(p=>'<button class="product-tile" data-action="add-cart:'+p.id+'">'+thumb(p,true,p.photo)+'<strong>'+esc(p.name)+'</strong><small>'+p.stock+' '+p.unit.toLowerCase()+' tersedia</small><span class="price">'+money(p.price)+'</span></button>').join(''):'<p class="meta">Produk tidak ditemukan. Coba kata lain.</p>'
}
function total(list){
return list.reduce((s,i)=>s+i.price*i.qty,0)
}
function cartBody(){
return '<div class="section-head"><h2>Keranjang</h2>'+button('Kosongkan','clear-cart','subtle')+'</div>'+(cart.length?cart.map(i=>'<div class="row"><div class="row-content"><strong>'+esc(i.name)+'</strong><small>'+money(i.price)+' / '+i.unit+'</small><div class="qty"><button data-action="qty:'+i.id+':-1" aria-label="Kurangi '+esc(i.name)+'">'+ic('minus')+'</button><span>'+i.qty+'</span><button data-action="qty:'+i.id+':1" aria-label="Tambah '+esc(i.name)+'">'+ic('plus')+'</button></div></div><div class="row-end"><strong>'+money(i.price*i.qty)+'</strong><button class="icon-btn" data-action="remove-cart:'+i.id+'" aria-label="Hapus '+esc(i.name)+'">'+ic('trash')+'</button></div></div>').join(''):'<div class="empty">'+ic('cart')+'<h3>Keranjang masih kosong</h3><p>Pilih produk, gunakan scanner, atau ambil beberapa foto.</p></div>')+'<div class="cart-total"><div class="total-line"><span>Subtotal</span><span>'+money(total(cart))+'</span></div><div class="total-line"><span>Diskon</span><span>'+money(0)+'</span></div><div class="total-line large"><span>Total</span><span>'+money(total(cart))+'</span></div><button class="btn primary" data-action="payment" '+(!cart.length?'disabled':'')+'>Lanjut pembayaran '+ic('chevron')+'</button></div>'
}
function salesRows(n=5){
return Array.from({length:n},(_,i)=>'<a class="row" href="#sale"><span class="product-thumb">'+ic('receipt')+'</span><div class="row-content"><strong>PJ-080926-'+String(24-i).padStart(3,'0')+'</strong><small>'+['10.42','10.31','10.18','09.56','09.40'][i]+' · '+[5,3,2,7,4][i]+' barang · Tunai</small></div><div class="row-end"><strong>'+money([94500,38500,24000,128500,67000][i])+'</strong><small>'+badge('Lunas','ok')+'</small></div>'+ic('chevron')+'</a>').join('')
}
function salesPage(){
return head('Transaksi','Riwayat penjualan dan retur',button('Buka kasir','task:sale','primary','cart'))+(stateContent('Transaksi',button('Mulai penjualan','task:sale','primary','cart'))||section('','<div class="toolbar"><div class="search">'+ic('search')+'<input id="sales-search" placeholder="Cari nomor transaksi" aria-label="Cari transaksi"></div><select id="sales-period" aria-label="Periode transaksi">'+['Hari ini','7 hari terakhir','Bulan ini'].map(p=>'<option'+(p===salesFilter?' selected':'')+'>'+p+'</option>').join('')+'</select>'+button('Retur','navigate:return','','refresh')+'</div><div class="result-caption" id="sales-count">5 transaksi · '+salesFilter+'</div><div id="sales-rows">'+salesRows()+'</div>'))
}
function salePage(){
return head('Detail transaksi',saleNumber,button('Cetak struk','print','','download')+link('Buat retur','return','','refresh'),'sales')+'<div class="receipt"><div class="receipt-title"><h2>'+esc(storeName)+'</h2><p class="meta">Jl. Merdeka No. 18, Bandung</p><p class="meta" style="margin-top:14px">'+saleNumber+' · 8 Sep 2026, 10.42</p></div><div class="receipt-items">'+[products[0],products[1],products[2]].map((p,i)=>'<div class="total-line"><span>'+esc(p.name)+'<br><small>'+[2,3,2][i]+' × '+money(p.price)+'</small></span><strong>'+money(p.price*[2,3,2][i])+'</strong></div>').join('')+'</div><div style="padding-top:20px"><div class="total-line large"><span>Total</span><span>'+money(60500)+'</span></div><div class="total-line"><span>Tunai</span><span>'+money(100000)+'</span></div><div class="total-line"><span>Kembalian</span><span>'+money(39500)+'</span></div></div><div class="receipt-footer">Terima kasih sudah berbelanja.<br>Struk contoh · bukan bukti transaksi nyata</div></div>'
}
function returnPage(){
return '<div class="form-wrap">'+head('Retur penjualan','Pilih barang dan jumlah yang dikembalikan.','','sale')+'<form id="return-form" class="section"><div class="section-head"><h2>'+saleNumber+'</h2>'+badge('Lunas','ok')+'</div>'+products.slice(0,3).map(p=>'<div class="row">'+thumb(p)+'<div class="row-content"><strong>'+p.name+'</strong><small>Terjual 2 · '+money(p.price)+' / pcs</small></div><input class="count-input" name="return-'+p.id+'" type="number" min="0" max="2" value="0" aria-label="Jumlah retur '+p.name+'"></div>').join('')+'<div class="form-section"><div class="form-grid">'+selectField('Alasan retur','reason',['Barang rusak','Salah produk','Alasan lainnya'])+selectField('Pengembalian dana','refund',['Kas toko','Bank BCA'])+'</div></div><div class="form-actions">'+link('Batal','sale')+'<button class="btn primary" type="submit">Proses retur contoh</button></div></form></div>'
}
function purchasing(){
return head('Pembelian','Barang masuk dan utang supplier',button('Kamera','scan:purchase','','camera')+button('Tambah pembelian','purchase-form','primary','plus'))+(stateContent('Pembelian',button('Tambah pembelian','purchase-form','primary','plus'))||'<div class="summary-strip">'+summary('Pembelian bulan ini',money(4250000),'12 pembelian')+summary('Utang supplier',money(1250000),'3 dokumen belum lunas')+summary('Jatuh tempo hari ini',money(450000),'CV Berkah Pangan')+summary('Sudah dibayar',money(3000000),'Bulan September')+'</div>'+section('Riwayat pembelian',row('PB-080926-012','CV Berkah Pangan · 8 Sep 2026','<strong>'+money(750000)+'</strong><small>'+badge('Belum lunas','warn')+'</small>','truck')+row('PB-070926-011','UD Sumber Makmur · 7 Sep 2026','<strong>'+money(520000)+'</strong><small>'+badge('Lunas','ok')+'</small>','truck'))+'<div style="height:20px"></div>'+section('Utang supplier',row('CV Berkah Pangan','Jatuh tempo hari ini','<strong>'+money(450000)+'</strong>'+button('Bayar utang','payable','subtle'),'wallet'),button('Lihat supplier','navigate:suppliers','subtle','chevron')))
}
function inventory(){
return head('Persediaan','Stok tersedia dan batas minimum',button('Kamera','scan:stock','','camera')+button('Sesuaikan stok','adjustment','primary','edit'))+(stateContent('Persediaan',button('Tambah produk','navigate:products','primary','plus'))||section('','<div class="toolbar"><div class="search">'+ic('search')+'<input id="inventory-search" placeholder="Cari produk" aria-label="Cari produk persediaan"></div><select id="stock-filter" aria-label="Status stok"><option>Semua stok</option><option>Hampir habis</option></select>'+link('Stok opname','counts','','box')+'</div><div id="inventory-results">'+inventoryRows(products)+'</div>'))
}
function inventoryRows(list){
return list.length?list.map(p=>'<div class="row">'+thumb(p)+'<div class="row-content"><strong>'+esc(p.name)+'</strong><small>Minimum '+p.min+' '+p.unit.toLowerCase()+'</small></div><div class="row-end"><strong>'+p.stock+' '+p.unit.toLowerCase()+'</strong><small>'+badge(p.stock<p.min?'Hampir habis':'Cukup',p.stock<p.min?'warn':'ok')+'</small></div><button class="icon-btn" data-action="adjustment:'+p.id+'" aria-label="Sesuaikan stok '+esc(p.name)+'">'+ic('edit')+'</button></div>').join(''):'<div class="empty"><h2>Produk tidak ditemukan</h2><p>Ganti nama atau status stok.</p></div>'
}
function counts(){
return head('Stok opname','Cocokkan stok sistem dengan barang di toko',button('Mulai opname','start-count','primary','plus'))+(stateContent('Stok opname',button('Mulai opname','start-count','primary','plus'))||section('','<a class="row" href="#count">'+ic('box')+'<div class="row-content"><strong>SO-080926-003</strong><small>8 Sep 2026 · 6 produk · Dina</small></div>'+badge('Sedang dihitung','warn')+ic('chevron')+'</a><a class="row" href="#count">'+ic('box')+'<div class="row-content"><strong>SO-010926-002</strong><small>1 Sep 2026 · 6 produk · Dina</small></div>'+badge('Selesai','ok')+ic('chevron')+'</a>'))
}
function countPage(){
return head('Hitung stok','SO-080926-003 · Simpan hasil hitungan sebelum menyelesaikan.',button('Simpan hitungan','save-count','','check')+button('Selesaikan','finish-count','primary','check'),'counts')+section('Produk yang dihitung','<div class="table-scroll"><table class="list-table"><thead><tr><th>Produk</th><th>Sistem</th><th>Fisik</th><th>Selisih</th></tr></thead><tbody>'+products.map(p=>'<tr><td><strong>'+p.name+'</strong><br><small>'+p.unit+'</small></td><td>'+p.stock+'</td><td><input class="count-input" type="number" min="0" name="count-'+p.id+'" data-count="'+p.id+'" aria-label="Stok fisik '+p.name+'" value="'+(opname[p.id]??p.stock)+'"></td><td id="diff-'+p.id+'">'+((opname[p.id]??p.stock)-p.stock)+'</td></tr>').join('')+'</tbody></table></div>')+'<div class="inline-note" style="margin-top:18px">Selisih perlu diperiksa sebelum hasil opname diterapkan. Dalam prototype ini, penyelesaian hanya simulasi.</div>'
}
function cashPage(){
return head('Kas & bank','Saldo dan pergerakan uang toko',button('Saldo awal','opening-cash','','plus')+button('Transfer antar akun','transfer','primary','wallet'))+(stateContent('Pergerakan kas',button('Isi saldo awal','opening-cash','primary','plus'))||'<div class="summary-strip">'+summary('Kas toko',money(1825000),'Tunai')+summary('Bank BCA',money(4000000),'Rekening toko')+summary('Penerimaan hari ini',money(1248500),'Dari penjualan')+summary('Pengeluaran hari ini',money(85000),'Biaya operasional')+'</div>'+section('Riwayat kas',row('Penjualan PJ-080926-024','Kas toko · 10.42','<strong style="color:var(--success)">+'+money(94500)+'</strong>','receipt')+row('Biaya listrik','Kas toko · 09.20','<strong>−'+money(85000)+'</strong>','wallet')+row('Modal pemilik','Bank BCA · Kemarin','<strong style="color:var(--success)">+'+money(1000000)+'</strong>','plus')))
}
function capitalPage(){
return head('Modal pemilik','Catatan setoran dan pengambilan pemilik',button('Ambil modal','capital-out','','minus')+button('Tambah modal','capital-in','primary','plus'))+(stateContent('Modal',button('Tambah modal','capital-in','primary','plus'))||'<div class="summary-strip">'+summary('Total setoran',money(15000000),'Sejak toko dibuka')+summary('Total pengambilan',money(1500000),'Pengambilan pemilik')+summary('Modal bersih',money(13500000),'Setoran − pengambilan')+summary('Setoran terakhir',money(1000000),'7 September 2026')+'</div>'+section('Riwayat modal',row('Setoran modal','Bank BCA · 7 Sep 2026','<strong>+'+money(1000000)+'</strong>','plus')+row('Pengambilan pemilik','Kas toko · 1 Sep 2026','<strong>−'+money(500000)+'</strong>','minus')))
}
function expensesPage(){
return head('Biaya toko','Catat pengeluaran operasional',button('Kategori biaya','expense-category','','tag')+button('Tambah biaya','expense-form','primary','plus'))+(stateContent('Biaya',button('Tambah biaya','expense-form','primary','plus'))||section('','<div class="toolbar"><div class="search">'+ic('search')+'<input id="expense-search" placeholder="Cari catatan biaya" aria-label="Cari biaya"></div><select id="expense-period" aria-label="Periode biaya"><option>Bulan ini</option><option>Hari ini</option></select></div><div class="result-caption">Total bulan ini · '+money(485000)+'</div><div id="expense-rows">'+row('Token listrik','Listrik & air · 8 Sep 2026 · Kas toko','<strong>'+money(85000)+'</strong>','wallet')+row('Kantong belanja','Perlengkapan · 6 Sep 2026 · Kas toko','<strong>'+money(50000)+'</strong>','box')+row('Internet toko','Internet · 1 Sep 2026 · Bank BCA','<strong>'+money(350000)+'</strong>','wallet')+'</div>'))
}
function reports(){
return head('Laporan usaha','Ringkasan operasional untuk memahami kondisi toko','<select id="report-period" aria-label="Periode laporan"><option>September 2026</option><option>Hari ini</option></select>'+button('Unduh ringkasan','export-report','','download'))+(stateContent('Laporan',button('Buka kasir','task:sale','primary','cart'))||'<div class="report-grid">'+section('Penjualan & laba',metric('Penjualan kotor',money(18750000))+metric('Retur penjualan','−'+money(125000))+metric('Penjualan bersih',money(18625000),true)+metric('Harga pokok penjualan','−'+money(14325000))+metric('Laba kotor',money(4300000),true)+metric('Biaya operasional','−'+money(485000))+metric('Estimasi laba usaha',money(3815000),true))+section('Posisi usaha',metric('Saldo kas & bank',money(5825000))+metric('Nilai persediaan',money(8750000))+metric('Utang supplier',money(1250000))+metric('Modal bersih',money(13500000))+'<div class="section-body"><p class="meta">Posisi pada akhir periode. Nilai persediaan menggunakan harga pokok.</p></div>')+'</div><div style="height:24px"></div>'+section('Produk terlaris','<div class="table-scroll"><table class="list-table"><thead><tr><th>Produk</th><th>Terjual</th><th>Penjualan</th></tr></thead><tbody>'+products.slice(0,4).map((p,i)=>'<tr><td>'+esc(p.name)+'</td><td>'+[85,124,46,37][i]+' pcs</td><td class="numeric">'+money(p.price*[85,124,46,37][i])+'</td></tr>').join('')+'</tbody></table></div>'))
}
function metric(label,value,highlight=false){
return '<div class="metric-row'+(highlight?' highlight':'')+'"><span>'+label+'</span><strong>'+value+'</strong></div>'
}
const refs={categories:[['Sembako','2 produk'],['Makanan','1 produk'],['Minuman','2 produk'],['Rumah tangga','1 produk']],units:[['Pcs','Satuan barang'],['Kg','Berat'],['Liter','Volume'],['Dus','Kemasan']],suppliers:[['CV Berkah Pangan','0812 3456 7890 · Bandung'],['UD Sumber Makmur','0821 4567 8901 · Cimahi']],accounts:[['Kas toko','Tunai · Saldo '+money(1825000)],['Bank BCA','Bank · Saldo '+money(4000000)]]};
function referencePage(){
const title=names[route]||'Data pendukung';

return head(title,'Data pendukung operasional toko',button('Tambah '+({categories:'kategori',units:'satuan',suppliers:'supplier',accounts:'akun'}[route]||'data'),'reference-new','primary','plus'),'products')+(stateContent(title,button('Tambah data','reference-new','primary','plus'))||section('',(refs[route]||[]).concat(referenceExtra[route]||[]).map((r,i)=>'<div class="row">'+ic(route==='accounts'?'wallet':'tag')+'<div class="row-content"><strong>'+esc(r[0])+'</strong><small>'+esc(r[1])+'</small></div>'+badge('Aktif','ok')+'<button class="icon-btn" data-action="reference-edit:'+i+'" aria-label="Edit '+esc(r[0])+'">'+ic('edit')+'</button></div>').join('')))
}
function storesPage(){
return head('Toko & anggota','Kelola toko yang bisa diakses akunmu',link('Buat toko','store-create','primary','plus'))+section('',[['Toko Sumber Rezeki','Bandung · 3 anggota'],['Toko Cabang Antapani','Bandung · 2 anggota']].map((s,i)=>'<div class="row">'+ic('store')+'<div class="row-content"><strong>'+s[0]+'</strong><small>'+s[1]+'</small></div>'+(storeId===i+1?badge('Aktif','ok'):'')+'<a class="icon-btn" href="#store" aria-label="Kelola '+s[0]+'">'+ic('chevron')+'</a></div>').join(''))
}
function storeForm(){
return '<div class="form-wrap">'+head('Buat toko','Identitas toko untuk transaksi dan struk.','','stores')+'<form id="store-form" class="section"><div class="form-section"><div class="form-grid">'+field('Nama toko','store-name','','text',true,true)+field('Nomor telepon','store-phone','','tel')+selectField('Negara','country',['Indonesia','Malaysia'])+field('Alamat toko','store-address','','text',true,true)+selectField('Zona waktu','timezone',['Asia/Jakarta','Asia/Makassar','Asia/Jayapura'])+selectField('Mata uang','currency',['IDR — Rupiah','MYR — Ringgit'])+'</div></div><div class="form-actions">'+link('Batal','stores')+'<button class="btn primary" type="submit">Buat toko contoh</button></div></form></div>'
}
function storePage(){
return head(esc(storeName),'Identitas toko dan akses anggota',button('Ubah identitas','store-edit','','edit'),'stores')+'<div class="two-col">'+section('Identitas toko',metric('Nama toko',esc(storeName))+metric('Negara','Indonesia')+metric('Mata uang','IDR · Rupiah')+metric('Zona waktu','Asia/Jakarta')+'<div class="section-body"><p class="meta">Jl. Merdeka No. 18, Bandung<br>0812 3456 7890</p></div>')+section('Anggota toko',[['Dina Rahma','Pemilik','DR'],['Rani','Kasir','RA'],['Budi','Pengelola','BU']].map(m=>'<div class="row"><span class="member-avatar">'+m[2]+'</span><div class="row-content"><strong>'+m[0]+'</strong><small>'+m[1]+'</small></div><button class="icon-btn" data-action="member-edit:'+m[0]+'" aria-label="Kelola akses '+m[0]+'">'+ic('edit')+'</button></div>').join(''),button('Tambah','member-add','subtle','plus'))+'</div><div class="section" style="margin-top:24px"><div class="section-body"><h2>Status toko</h2><p class="meta" style="margin:8px 0 16px">Toko aktif dan bisa digunakan anggota sesuai perannya.</p>'+button('Nonaktifkan toko','disable-store','danger')+'</div></div>'
}
function settingsNav(){
return '<nav class="settings-nav" aria-label="Pengaturan">'+[['profile','Profil & toko'],['security','Keamanan'],['appearance','Tampilan']].map(([r,l])=>'<a href="#'+r+'" class="'+(r===route?'active':'')+'">'+l+'</a>').join('')+'</nav>'
}
function profilePage(){
return '<div class="form-wrap">'+head('Pengaturan akun','Profil dan preferensi toko aktif.')+settingsNav()+'<form id="profile-form" class="section"><div class="form-section"><h2>Profil</h2><div class="form-grid">'+field('Nama lengkap','profile-name','Dina Rahma','text',true,true)+field('Email','profile-email','dina@example.test','email',true,true)+'</div></div><div class="form-section"><h2>Struk toko</h2><div class="form-grid">'+field('Nama pada struk','receipt-name',storeName,'text',true)+selectField('Lebar kertas','paper',['58 mm','80 mm'])+field('Telepon toko','receipt-phone','0812 3456 7890','tel')+field('Pesan penutup','receipt-footer','Terima kasih sudah berbelanja.','text',true)+'</div></div><div class="form-actions"><button class="btn primary" type="submit">Simpan perubahan</button></div></form></div>'
}
function securityPage(){
return '<div class="form-wrap">'+head('Keamanan','Lindungi akses akunmu.')+settingsNav()+'<div class="stack">'+section('Kata sandi','<div class="section-body"><p class="meta" style="margin-bottom:16px">Gunakan kata sandi yang hanya dipakai untuk akun ini.</p>'+button('Ubah kata sandi','password-form','','shield')+'</div>')+section('Verifikasi dua langkah','<div class="row"><div class="row-content"><strong>Autentikator</strong><small>Tambahan verifikasi saat masuk.</small></div>'+badge('Belum aktif','warn')+'</div><div class="section-body">'+button('Siapkan autentikator','two-factor','','shield')+'</div>')+section('Passkey','<div class="section-body"><p class="meta" style="margin-bottom:16px">Masuk menggunakan keamanan perangkat.</p>'+button('Tambah passkey','passkey','','plus')+'</div>')+'</div></div>'
}
function appearancePage(){
return '<div class="form-wrap">'+head('Tampilan','Warna toko diterapkan konsisten ke seluruh halaman.')+settingsNav()+section('Warna utama','<div class="section-body"><div class="color-options">'+['#ee4d2d','#3b9270','#e5b94e','#749ed4','#b38ac4'].map(c=>'<button class="color-choice '+(theme===c?'active':'')+'" style="background:'+c+'" data-action="theme:'+c+'" aria-label="Pilih warna '+c+'" aria-pressed="'+(theme===c)+'"></button>').join('')+'</div><p class="meta" style="margin-top:18px">Warna saat ini: '+theme.toUpperCase()+'</p></div>')+'<div style="height:20px"></div>'+section('Keterbacaan','<div class="section-body"><h2 style="margin-bottom:10px">Produk & persediaan</h2><p>Nama produk, harga, dan status menggunakan satu keluarga huruf yang sama.</p><p class="meta" style="margin:12px 0 20px">Contoh harga · '+money(18500)+'</p>'+button('Contoh tindakan','demo-button','primary')+'</div>')+'</div>'
}
function subscriptionPage(){
return head('Paket & langganan','Akses dan penggunaan toko aktif',button('Lihat pilihan paket','plans','','chevron'))+'<div class="two-col">'+section('Paket Toko','<div class="section-body">'+badge('Aktif','ok')+'<h2 style="margin-top:14px">Periode 1–30 September 2026</h2><p class="meta" style="margin-top:8px">Contoh paket untuk review tampilan.</p></div>'+metric('Anggota','3 / 5')+metric('Produk','6 / 500'))+section('Penggunaan scan AI','<div class="section-body"><div class="total-line"><strong>128 scan</strong><span class="meta">dari 500</span></div><div class="progress"><span style="width:25.6%"></span></div><p class="meta">372 scan tersisa pada periode ini.</p><div style="margin-top:20px">'+button('Tambah kapasitas','capacity','','plus')+'</div></div>')+'</div><div style="height:24px"></div>'+section('Riwayat langganan',row('September 2026','1–30 Sep 2026','<strong>'+badge('Berjalan','ok')+'</strong>','clock')+row('Agustus 2026','1–31 Agu 2026','<strong>'+badge('Selesai')+'</strong>','clock'))
}
function draftsPage(){
if(scanPurpose!=='product'){
selectCameraPurpose('product');
}

const list=scanResults.filter(r=>!r.skipped&&!r.saved);

return head('Draf produk',list.length+' hasil foto · periksa nama dan harga sebelum menyimpan.',button('Tambah foto','scan:product','','camera')+button('Simpan yang siap','save-drafts','primary','check'),'products')+(list.length?'<div class="inline-note wide-note">Harga dari AI adalah perkiraan. Periksa harga beli dan harga jual sebelum menyimpan. Seluruh hasil di sini adalah simulasi.</div>'+section('',list.map(r=>draftRow(r)).join('')):section('','<div class="empty">'+ic('check')+'<h2>'+ (savedDrafts?'Draf sudah disimpan':'Belum ada draf')+'</h2><p>'+(savedDrafts?savedDrafts+' produk contoh ditambahkan ke katalog.':'Ambil atau pilih beberapa foto produk untuk memulai.')+'</p>'+link('Lihat produk','products','primary')+'</div>'))
}
function draftRow(r){
return '<div class="review-row">'+thumb(r.product,false,r.preview)+'<div><div class="review-header"><strong>Foto '+(r.index+1)+'</strong><button class="icon-btn" data-action="skip-draft:'+r.id+'" aria-label="Hapus draf foto '+(r.index+1)+'">'+ic('close')+'</button></div>'+badge(r.duplicate?'Kemungkinan produk sama':r.status==='unknown'?'Nama perlu diisi':'Draf siap diperiksa',r.duplicate||r.status==='unknown'?'warn':'ok')+(r.duplicate?'<div class="review-tools">'+button('Foto sama, lewati','skip-draft:'+r.id)+button('Produk berbeda','keep-draft:'+r.id)+'</div>':'')+'</div><div class="review-fields draft-fields">'+field('Nama produk','draft-name-'+r.id,r.name,'text',true,true)+field('Harga beli (Rp)','draft-cost-'+r.id,r.cost,'number')+field('Harga jual (Rp)','draft-price-'+r.id,r.price,'number')+selectField('Satuan','draft-unit-'+r.id,['Pcs','Kg','Liter','Dus'])+selectField('Kategori','draft-cat-'+r.id,['Sembako','Makanan','Minuman','Rumah tangga'])+'</div></div>'
}
function bindPage(){
const ps=$('#product-search');

if(ps){
ps.oninput=e=>{
search=e.target.value;$('#product-results').innerHTML=productResults()
};
}

const cf=$('#category-filter');

if(cf){
cf.onchange=e=>{
category=e.target.value;$('#product-results').innerHTML=productResults()
};
}

const pos=$('#pos-search');

if(pos){
pos.oninput=e=>{
search=e.target.value;$('#pos-results').innerHTML=posResults()
};pos.onkeydown=e=>{
if(e.key==='Enter'){
const list=filteredProducts();const p=products.find(p=>p.barcode===pos.value.trim()||p.sku===pos.value.trim())||(pos.value.trim()&&list.length===1?list[0]:null);

if(p){
addCart(p);search='';render();$('#pos-search')?.focus()
}else {
toast('Pilih produk dari hasil pencarian atau periksa kode barcode.')
}
}
}
}

const inv=$('#inventory-search'),sf=$('#stock-filter');

if(inv&&sf){
const refresh=()=>$('#inventory-results').innerHTML=inventoryRows(products.filter(p=>p.name.toLowerCase().includes(inv.value.toLowerCase())&&(sf.value!=='Hampir habis'||p.stock<p.min)));inv.oninput=refresh;sf.onchange=refresh
}

all('[data-count]').forEach(el=>el.oninput=()=>{
const p=products.find(p=>p.id===Number(el.dataset.count));opname[p.id]=Number(el.value);$('#diff-'+p.id).textContent=opname[p.id]-p.stock
});const sp=$('#sales-period');

if(sp){
sp.onchange=e=>{
salesFilter=e.target.value;$('#sales-count').textContent='5 transaksi contoh · '+salesFilter;toast('Periode contoh: '+salesFilter)
};
}

const ss=$('#sales-search');

if(ss){
ss.oninput=()=>{
let count=0;all('#sales-rows .row').forEach(r=>{
r.hidden=!r.textContent.toLowerCase().includes(ss.value.toLowerCase());

if(!r.hidden){
count++
}
});$('#sales-count').textContent=count+' transaksi ditemukan'
};
}

const ex=$('#expense-search');

if(ex){
ex.oninput=()=>all('#expense-rows .row').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(ex.value.toLowerCase()));
}

const ep=$('#expense-period');

if(ep){
ep.onchange=()=>{
all('#expense-rows .row').forEach((r,i)=>r.hidden=ep.value==='Hari ini'&&i>0)
};
}

const rp=$('#report-period');

if(rp){
rp.onchange=()=>toast('Periode contoh dipilih: '+rp.value);
}

if(route==='drafts'){
scanResults.forEach(r=>{
['name','cost','price'].forEach(k=>{
const el=$('#draft-'+k+'-'+r.id);

if(el){
el.oninput=()=>r[k]=k==='name'?el.value:Number(el.value)
}
});['unit','cat'].forEach(k=>{
const el=$('#draft-'+k+'-'+r.id);

if(el){
el.value=r[k]||'Pcs';

if(!el.value){
el.selectedIndex=0;
}

el.onchange=()=>r[k]=el.value
}
})
})
}
}
const overlay=$('#overlay');
let menuTrigger=null;
let cameraMode='photo',cameraError='',barcodeMatch=null,barcodeUnknown=false;
const cameraSessions={};
function selectCameraPurpose(purpose){
cameraSessions[scanPurpose]={captures,scanResults};scanPurpose=purpose;const session=cameraSessions[purpose];captures=session?.captures||[];scanResults=session?.scanResults||[];
}
function toast(message){
$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3000)
}
function stopCamera(){
stream?.getTracks().forEach(t=>t.stop());stream=null
}
function closeDialog(){
stopCamera();scanGeneration++;processing=false;overlay.close();overlay.className='';dialogStep='';overlay.removeAttribute('style');

if(menuTrigger?.isConnected){
menuTrigger.setAttribute('aria-expanded','false');menuTrigger.focus()
}

menuTrigger=null
}
function showDialog(title,body,footer='',back=''){
const menuTitles=['Lainnya','Pilih toko','Notifikasi','Dina Rahma','Bahasa aplikasi'];const dropdown=menuTitles.includes(title)&&(title!=='Lainnya'||window.innerWidth>=768);overlay.classList.toggle('compact-modal',!dropdown&&!overlay.classList.contains('camera-dialog')&&title!=='Lainnya'&&title!=='Pusat Kasir');overlay.classList.toggle('nav-dropdown',dropdown);overlay.classList.toggle('wide-menu',dropdown&&title==='Lainnya');overlay.removeAttribute('style');overlay.innerHTML='<div class="dialog-head">'+(back?'<button class="icon-btn" data-action="'+back+'" aria-label="Kembali">'+ic('back')+'</button>':'')+'<h2 id="dialog-title">'+title+'</h2><button class="icon-btn" data-action="close" aria-label="Tutup">'+ic('close')+'</button></div>'+body+(footer?'<div class="dialog-footer">'+footer+'</div>':'');overlay.setAttribute('aria-labelledby','dialog-title');

if(!overlay.open){
overlay.showModal();
}

if(dropdown&&menuTrigger){
const rect=menuTrigger.getBoundingClientRect(),width=Math.min(title==='Lainnya'?620:380,window.innerWidth-32);overlay.style.left=Math.max(16,Math.min(rect.left,window.innerWidth-width-16))+'px';

if(title==='Lainnya'&&menuTrigger.closest('.bottom-nav')){
overlay.style.bottom=(window.innerHeight-rect.top+12)+'px';overlay.style.top='auto';overlay.style.maxHeight=Math.max(100,rect.top-28)+'px'
}else{
overlay.style.top=Math.min(rect.bottom+8,window.innerHeight-120)+'px';overlay.style.maxHeight=Math.max(100,window.innerHeight-rect.bottom-24)+'px'
}
}
}
function cashier(){
dialogStep='cashier';overlay.className='';showDialog('Pusat Kasir','<div class="dialog-body">'+Object.entries(purposes).map(([key,p])=>'<button class="task-row" data-action="task:'+key+'"><span class="task-icon">'+ic(p[2])+'</span><span><strong>'+p[0]+'</strong><small>'+p[1]+'</small></span>'+ic('chevron')+'</button>').join('')+'</div>')
}
function task(purpose){
activeProduct=null;navigate({sale:'pos',purchase:'purchasing',stock:'inventory',product:'product-new'}[purpose])
}
function captureView(purpose){
 if(purpose!==scanPurpose){
selectCameraPurpose(purpose);
}

 dialogStep='capture';overlay.className='camera-dialog';
 const photo=cameraMode==='photo',pending=captures.filter(c=>!c.processed).length;
 const tabs='<div class="camera-modes" role="group" aria-label="Mode kamera">'+[['photo','Foto AI'],['barcode','Barcode']].map(([mode,label])=>'<button aria-pressed="'+(cameraMode===mode)+'" data-action="camera-mode:'+mode+'">'+label+'</button>').join('')+'</div>';
 const preview='<div class="camera-stage"><div class="camera-placeholder">'+ic(photo?'camera':'scan')+'<h2>'+(photo?'Foto dulu, proses bersama':'Arahkan ke barcode')+'</h2><p>'+(photo?'Ambil beberapa foto atau pilih dari galeri.':'Kode dibaca otomatis saat terlihat jelas.')+'</p>'+button('Aktifkan kamera','camera-start','','camera')+'</div></div>';
 const tray=photo?'<div class="capture-list">'+(captures.length?captures.map((c,i)=>'<div class="capture">'+thumb(c.product,false,c.preview)+'<button class="icon-btn" data-action="remove-photo:'+i+'" aria-label="Hapus foto '+(i+1)+'">'+ic('close')+'</button><small>'+(c.processed?'Sudah diproses':'Foto '+(i+1))+'</small></div>').join(''):'<p class="meta">Belum ada foto. Ambil satu foto untuk setiap produk.</p>')+'</div>':'';
 const controls=photo?'<div class="camera-controls">'+button('Galeri','choose-files','','image')+'<button class="shutter" data-action="capture-photo" aria-label="Ambil foto">'+ic('camera')+'</button>'+button('Foto contoh','sample-photo','','plus')+'</div>':'<div class="barcode-feedback" role="status">'+(barcodeUnknown?'<strong>Produk belum ditemukan</strong><p>Kode contoh: 8990000000000</p>'+button(scanPurpose==='product'?'Isi produk baru':'Cari manual','barcode-unknown','','edit'):barcodeMatch?'<div class="product-lead">'+thumb(barcodeMatch)+'<div><strong>'+esc(barcodeMatch.name)+'</strong><p>'+money(barcodeMatch.price)+' · stok '+barcodeMatch.stock+' '+barcodeMatch.unit+'</p></div></div>'+button(scanPurpose==='product'?'Buka produk katalog':scanPurpose==='stock'?'Lihat persediaan':scanPurpose==='purchase'?'Masukkan ke pembelian':'Tambah ke keranjang','barcode-use','primary','check'):'<p>Hasil barcode muncul di sini sebelum digunakan.</p>')+'</div><div class="barcode-demo">'+button('Coba kode dikenal','barcode-demo:known','','scan')+button('Coba kode baru','barcode-demo:unknown','','plus')+'</div>';
 const footer=photo?'<button class="btn primary" data-action="process-photos" '+(!pending?'disabled':'')+'>Proses '+pending+' foto '+ic('chevron')+'</button>':button('Selesai','close','primary','check');
 showDialog('Kamera · '+purposes[purpose][0],tabs+preview+(cameraError?'<p class="inline-error camera-error" role="alert">'+cameraError+'</p>':'')+tray+controls+'<div class="camera-alternative">'+button(purpose==='product'?'Isi manual':'Cari manual','camera-manual','','edit')+(photo?(scanResults.some(r=>!r.skipped&&!r.saved)?button('Periksa hasil','resume-results','','check'):''):'<span>'+pending+' foto AI tersimpan</span>')+'</div><p class="camera-hint">'+(photo?'AI disimulasikan; foto tetap di perangkat.':'Pembacaan barcode disimulasikan pada prototype.')+'</p><input type="file" id="photo-files" accept="image/*" multiple hidden>',footer);

 if(stream){
$('.camera-stage').innerHTML='<video autoplay playsinline muted></video>';$('.camera-stage video').srcObject=stream
}

 $('#photo-files').onchange=e=>{
let rejected=0;[...e.target.files].forEach(f=>{
if(!f.type.startsWith('image/')||f.size>8*1024*1024){
rejected++;

return
}

captures.push({id:crypto.randomUUID(),preview:URL.createObjectURL(f),product:products[captures.length%products.length]})
});captureView(purpose);

if(rejected){
toast(rejected+' file dilewati. Pilih gambar maksimal 8 MB.')
}
};
}
function makeResults(){
captures.forEach((c,i)=>{
if(c.processed){
return;
}

const p=i===4?products[0]:(c.product||products[i%products.length]);scanResults.push({...c,product:p,index:i,name:i===3?'':p.name,price:p.price,cost:p.cost,unit:p.unit,cat:p.cat,qty:1,status:i===3?'unknown':'found',duplicate:i===4,skipped:false,saved:false});c.processed=true
})
}
function reviewView(){
 dialogStep='review';overlay.className='camera-dialog';
 const visible=scanResults.filter(r=>!r.skipped&&!r.saved),ready=visible.filter(r=>r.status==='found'&&!r.duplicate),pending=visible.length-ready.length;
 showDialog('Periksa hasil · '+purposes[scanPurpose][0],'<div class="review-stats">'+badge(ready.length+' siap','ok')+badge(pending+' perlu diperiksa',pending?'warn':'')+'</div><div class="review-scroll">'+visible.map(r=>'<div class="review-row">'+thumb(r.product,false,r.preview)+'<div><div class="review-header"><strong>'+esc(r.status==='unknown'?'Produk belum dikenali':r.name)+'</strong><button class="icon-btn" data-action="skip-result:'+r.id+'" aria-label="Lewati foto '+(r.index+1)+'">'+ic('close')+'</button></div>'+badge(r.duplicate?'Foto mungkin berulang':r.status==='unknown'?'Cari kecocokan secara manual':'Cocok dengan katalog',r.duplicate||r.status==='unknown'?'warn':'ok')+'<label class="result-label" for="match-'+r.id+'">Produk untuk foto '+(r.index+1)+'</label><select id="match-'+r.id+'" data-result="'+r.id+'"><option value="">Pilih produk…</option>'+products.map(p=>'<option value="'+p.id+'" '+(r.status!=='unknown'&&r.product.id===p.id?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select>'+(r.duplicate?'<div class="review-tools">'+button('Foto sama, lewati','skip-result:'+r.id)+button('Barang tambahan','keep-result:'+r.id)+'</div>':'<div class="qty"><button data-action="result-qty:'+r.id+':-1" aria-label="Kurangi jumlah">'+ic('minus')+'</button><span>'+r.qty+'</span><button data-action="result-qty:'+r.id+':1" aria-label="Tambah jumlah">'+ic('plus')+'</button></div>')+'</div></div>').join('')+(!visible.length?'<div class="empty"><h3>Tidak ada hasil untuk digunakan</h3><p>Kembali ke kamera untuk menambah foto.</p></div>':'')+'</div><p class="pending-text">'+(pending?'Pilih kecocokan atau lewati hasil yang perlu diperiksa.':'Hasil siap digunakan. Jumlah masih bisa dikoreksi.')+'</p>','<button class="btn primary" data-action="confirm-results" '+(!ready.length||pending?'disabled':'')+'>'+(scanPurpose==='stock'?'Lihat stok hasil':scanPurpose==='purchase'?'Masukkan ke pembelian':'Masukkan '+ready.length+' hasil ke keranjang')+'</button>','capture-back');
 all('[data-result]').forEach(el=>el.onchange=()=>{
const r=scanResults.find(r=>r.id===el.dataset.result),p=products.find(p=>p.id===+el.value);

if(p){
Object.assign(r,{product:p,name:p.name,price:p.price,status:'found'});
}else {
r.status='unknown';
}

reviewView()
});
}
async function processPhotos(){
const pending=captures.filter(c=>!c.processed);

if(!pending.length||processing){
return;
}

processing=true;stopCamera();const generation=++scanGeneration;showDialog('Memproses '+pending.length+' foto','<div class="dialog-body"><div class="progress"><span id="scan-progress" style="width:0"></span></div><p id="scan-message" role="status">Menyiapkan foto…</p><p class="prototype-note">Simulasi pengenalan untuk mencoba desain.</p></div>');

for(let i=0;i<pending.length;i++){
await new Promise(r=>setTimeout(r,180));

if(generation!==scanGeneration){
return;
}

$('#scan-progress').style.width=((i+1)/pending.length*100)+'%';$('#scan-message').textContent=(i+1)+' dari '+pending.length+' foto diproses'
}

processing=false;makeResults();

if(scanPurpose==='product'){
navigate('drafts');
}else {
reviewView()
}
}
function navigate(r){
closeDialog();

if(location.hash==='#'+r){
render();
}else {
location.hash=r
}
}
function addCart(p,qty=1){
let i=cart.find(i=>i.id===p.id);

if(i){
i.qty+=qty;
}else {
cart.push({...p,qty})
}
}
function payment(){
showDialog('Pembayaran','<form id="payment-form"><div class="dialog-body"><div class="total-line large"><span>Total</span><strong>'+money(total(cart))+'</strong></div>'+field('Uang diterima (Rp)','paid',total(cart),'number',true,true)+'<p class="meta" style="margin-top:14px">Transaksi contoh · tidak memproses pembayaran nyata.</p><p id="payment-error" class="inline-error"></p></div><div class="dialog-footer"><button class="btn primary" type="submit">Selesaikan transaksi contoh</button></div></form>')
}
function simpleForm(title,fields,action='generic-save'){
showDialog(title,'<form id="'+action+'"><div class="dialog-body"><div class="form-grid">'+fields+'</div><p class="prototype-note" style="margin-top:18px">Perubahan hanya berlaku pada data contoh sesi ini.</p></div><div class="dialog-footer"><button type="button" class="btn" data-action="close">Batal</button><button type="submit" class="btn primary">Simpan contoh</button></div></form>')
}
const menuItems=[['Operasional',[['inventory','Persediaan','box'],['counts','Stok opname','box'],['purchasing','Pembelian','truck'],['expenses','Biaya toko','wallet']]],['Usaha',[['reports','Laporan usaha','chart'],['cash','Kas & bank','wallet'],['capital','Modal pemilik','wallet']]],['Data pendukung',[['categories','Kategori','tag'],['units','Satuan','box'],['suppliers','Supplier','truck'],['accounts','Akun keuangan','wallet']]],['Toko & akun',[['stores','Toko & anggota','store'],['profile','Pengaturan','user'],['subscription','Langganan','clock']]]];
function more(){
showDialog('Lainnya','<div class="dialog-body menu-groups">'+menuItems.map(([title,items])=>'<section class="menu-group"><h3>'+title+'</h3>'+items.map(([r,l,i])=>'<a class="menu-link" href="#'+r+'">'+ic(i)+l+ic('chevron')+'</a>').join('')+'</section>').join('')+'</div>');overlay.classList.add('more-panel')
}
document.addEventListener('click',async e=>{
const el=e.target.closest('[data-action]');

if(!el){
return;
}

const [a,b,c]=el.dataset.action.split(':');

if(['more','product-menu','stores-switch','language','notifications','profile-menu'].includes(a)){
menuTrigger=el;el.setAttribute('aria-expanded','true');el.setAttribute('aria-haspopup','dialog')
}

switch(a){
case'close':closeDialog();break;case'navigate':navigate(b);break;case'cashier':cashier();break;case'task':task(b);break;case'more':case'product-menu':more();break;
case'manual':activeProduct=null;navigate({sale:'pos',purchase:'purchasing',stock:'inventory',product:'product-new'}[b]);

if(b==='purchase'){
document.querySelector('[data-action="purchase-form"]')?.click();
}

break;
case'scan':stopCamera();cameraMode='photo';barcodeMatch=null;barcodeUnknown=false;cameraError='';captureView(b);break;
case'resume-results':if(scanPurpose==='product'){
navigate('drafts');
}else{
stopCamera();reviewView()
}

break;
case'camera-mode':cameraMode=b;captureView(scanPurpose);break;
case'camera-manual':task(scanPurpose);toast('Foto sesi ini tersimpan. Buka Kamera untuk melanjutkan.');break;
case'barcode-demo':barcodeUnknown=b==='unknown';barcodeMatch=barcodeUnknown?null:products[1];captureView(scanPurpose);break;
case'barcode-unknown':if(scanPurpose==='product'){
activeProduct={barcode:'8990000000000'};navigate('product-new')
}else {
task(scanPurpose);
}

break;
case'barcode-use':if(!barcodeMatch){
break;
}

if(scanPurpose==='product'){
activeProduct=barcodeMatch;navigate('product-new')
}else if(scanPurpose==='stock'){
search=barcodeMatch.name;navigate('inventory');toast(barcodeMatch.name+' · stok '+barcodeMatch.stock)
}else if(scanPurpose==='purchase'){
purchaseCart.push({...barcodeMatch,qty:1});toast(barcodeMatch.name+' disiapkan untuk pembelian');barcodeMatch=null;captureView(scanPurpose)
}else{
addCart(barcodeMatch);render();toast('1 barang ditambahkan ke keranjang');barcodeMatch=null;captureView(scanPurpose)
}

break;case'capture-back':cameraMode='photo';captureView(scanPurpose);break;
case'sample-photo':captures.push({id:crypto.randomUUID(),product:products[captures.length%products.length],preview:''});captureView(scanPurpose);break;
case'remove-photo':{const removed=captures.splice(+b,1)[0];const result=scanResults.find(r=>r.id===removed.id);

if(result){
result.skipped=true;
}

captureView(scanPurpose);break;}
case'choose-files':$('#photo-files').click();break;
case'camera-start':{const generation=scanGeneration;

try{
const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});

if(!overlay.open||dialogStep!=='capture'||generation!==scanGeneration){
acquired.getTracks().forEach(t=>t.stop());break
}

stopCamera();stream=acquired;cameraError='';captureView(scanPurpose)
}catch{
cameraError='Kamera belum tersedia. Izinkan akses kamera, pilih galeri, atau lanjut manual.';captureView(scanPurpose)
}

break;}
case'capture-photo':{const v=$('.camera-stage video');

if(!v||!v.videoWidth){
toast('Aktifkan kamera, atau tekan Foto contoh untuk mencoba.');break
}

const generation=scanGeneration;const canvas=document.createElement('canvas');canvas.width=v.videoWidth;canvas.height=v.videoHeight;canvas.getContext('2d').drawImage(v,0,0);canvas.toBlob(blob=>{
if(!blob||generation!==scanGeneration||dialogStep!=='capture'){
return;
}

captures.push({id:crypto.randomUUID(),product:products[captures.length%products.length],preview:URL.createObjectURL(blob)});captureView(scanPurpose)
},'image/jpeg');break}
case'keep-result':scanResults.find(r=>r.id===b).duplicate=false;reviewView();break;
case'keep-draft':scanResults.find(r=>r.id===b).duplicate=false;render();break;
case'process-photos':processPhotos();break;case'skip-result':scanResults.find(r=>r.id===b).skipped=true;reviewView();break;case'result-qty':{const r=scanResults.find(r=>r.id===b);r.qty=Math.max(1,r.qty+Number(c));reviewView();break}
case'confirm-results':{const results=scanResults.filter(r=>!r.skipped&&!r.saved&&r.status==='found'&&!r.duplicate);

if(!results.length||scanResults.some(r=>!r.skipped&&!r.saved&&(r.status==='unknown'||r.duplicate))){
break;
}

results.forEach(r=>r.saved=true);

if(scanPurpose==='sale'){
results.forEach(r=>addCart(r.product,r.qty));navigate('pos');toast(results.length+' hasil ditambahkan ke keranjang')
}else if(scanPurpose==='stock'){
navigate('inventory');toast('Stok cocok untuk '+results.length+' hasil foto')
}else{
purchaseCart=results.map(r=>({...r.product,qty:r.qty}));navigate('purchasing');toast(results.length+' hasil disiapkan untuk pembelian');simpleForm('Pembelian dari '+results.length+' hasil foto',selectField('Supplier','supplier',['CV Berkah Pangan','UD Sumber Makmur'])+field('Nilai pembelian (Rp)','purchase-total',total(purchaseCart),'number',false,true))
}

break}

case'add-cart':addCart(products.find(p=>p.id===+b));render();toast('Produk ditambahkan');break;
case'qty':{const i=cart.find(i=>i.id===+b);i.qty+=+c;

if(i.qty<=0){
cart=cart.filter(i=>i.id!==+b);
}

render();break}
case'remove-cart':cart=cart.filter(i=>i.id!==+b);render();break;case'clear-cart':cart=[];render();break;case'jump-cart':$('#cart').scrollIntoView({behavior:'smooth'});break;
case'pos-category':category=b;render();break;case'payment':if(cart.length){
payment();
}

break;case'print':window.print();break;
case'clear-search':search='';category='Semua kategori';render();break;case'retry-state':viewState='normal';render();break;
case'edit-product':activeProduct=products.find(p=>p.id===+b);navigate('product-new');break;
case'skip-draft':scanResults.find(r=>r.id===b).skipped=true;render();break;
case'save-drafts':{let count=0;scanResults.forEach(r=>{
if(r.skipped||r.saved||!r.name.trim()||!(r.price>0)||r.duplicate){
return;
}

products.push({id:Date.now()+count,name:r.name,short:r.product.short,sku:'PRD-'+(products.length+1),barcode:'',cat:r.cat||'Sembako',unit:r.unit||'Pcs',price:+r.price,cost:+r.cost,stock:0,min:5,color:r.product.color,photo:r.preview});r.saved=true;count++
});savedDrafts+=count;render();toast(count?count+' produk contoh disimpan; draf belum siap tetap tersedia':'Isi nama dan harga. Foto duplikat perlu dilewati atau diperiksa.');break}
case'stores-switch':showDialog('Pilih toko','<div class="dialog-body">'+[['Toko Sumber Rezeki',1],['Toko Cabang Antapani',2]].map(([n,id])=>'<button class="task-row" data-action="switch-store:'+id+'"><span class="task-icon">'+ic('store')+'</span><span><strong>'+n+'</strong><small>'+ (id===storeId?'Toko aktif':'Buka toko ini')+'</small></span>'+ic(id===storeId?'check':'chevron')+'</button>').join('')+'</div>');break;
case'switch-store':if(cart.length){
showDialog('Keranjang masih berisi barang','<div class="dialog-body"><p>Selesaikan transaksi atau kosongkan keranjang sebelum berpindah toko.</p></div>',button('Kembali ke kasir','navigate:pos','primary'));break
}

storeId=+b;storeName=storeId===1?'Toko Sumber Rezeki':'Toko Cabang Antapani';closeDialog();render();toast('Toko aktif berubah · dataset contoh bersama');break;
case'notifications':showDialog('Notifikasi','<div class="dialog-body">'+row('Stok Indomie hampir habis','Sisa 8 pcs · minimum 12 pcs',link('Lihat','inventory','subtle'),'alert')+row('Utang jatuh tempo','CV Berkah Pangan · hari ini',link('Lihat','purchasing','subtle'),'clock')+'</div>',button('Tandai sudah dibaca','read-notifications','','check'));break;case'read-notifications':notificationsRead=true;closeDialog();render();toast('Notifikasi ditandai sudah dibaca');break;
case'profile-menu':showDialog('Dina Rahma','<div class="dialog-body"><p class="meta" style="margin:8px 0 18px">dina@example.test</p>'+[['profile','Profil & toko','user'],['security','Keamanan','shield'],['appearance','Tampilan','edit'],['subscription','Langganan','clock']].map(([r,l,i])=>'<a class="menu-link" href="#'+r+'">'+ic(i)+l+ic('chevron')+'</a>').join('')+'</div>');break;
case'language':showDialog('Bahasa aplikasi','<div class="dialog-body"><div class="row">Bahasa Indonesia '+badge('Aktif','ok')+'</div><p class="prototype-note" style="margin-top:14px">Prototype ini menggunakan Bahasa Indonesia. Bahasa Inggris dan Melayu tetap masuk kebutuhan aplikasi; terjemahan penuh tidak disimulasikan.</p></div>');break;
case'theme':theme=b;document.documentElement.style.setProperty('--brand',b);document.documentElement.style.setProperty('--action',b==='#ee4d2d'?'#c83c20':b);document.documentElement.style.setProperty('--on-action',b==='#ee4d2d'?'#fff':'#171412');closeDialog();render();break;
case'purchase-form':simpleForm('Tambah pembelian',selectField('Supplier','supplier',['CV Berkah Pangan','UD Sumber Makmur'])+selectField('Produk','product',products.map(p=>p.name))+field('Jumlah','quantity',1,'number',false,true)+field('Harga beli (Rp)','cost','','number',false,true)+selectField('Pembayaran','payment',['Tunai','Utang supplier'])+field('Tanggal','date','2026-09-08','date'));break;
case'payable':simpleForm('Bayar utang supplier',field('Nominal pembayaran (Rp)','amount',450000,'number',true,true)+selectField('Dari akun','account',['Kas toko','Bank BCA']));break;
case'adjustment':simpleForm('Sesuaikan stok',selectField('Produk','adjust-product',products.map(p=>p.name))+field('Stok fisik','adjust-qty',0,'number',false,true)+field('Alasan penyesuaian','reason','','text',true,true),'adjust-form');break;
case'start-count':navigate('count');break;case'save-count':toast('Hitungan disimpan pada sesi contoh');break;case'finish-count':showDialog('Selesaikan hitungan?','<div class="dialog-body"><p>Periksa selisih sebelum menyelesaikan. Stok produksi tidak akan diubah.</p></div>',button('Kembali','close')+button('Selesaikan contoh','count-done','primary'));break;case'count-done':navigate('counts');toast('Stok opname contoh selesai');break;
case'opening-cash':simpleForm('Saldo awal',selectField('Akun','account',['Kas toko','Bank BCA'])+field('Saldo awal (Rp)','amount','','number',false,true));break;
case'transfer':simpleForm('Transfer antar akun',selectField('Dari akun','from',['Kas toko','Bank BCA'])+selectField('Ke akun','to',['Bank BCA','Kas toko'])+field('Jumlah (Rp)','amount','','number',true,true));break;
case'capital-in':case'capital-out':simpleForm(a==='capital-in'?'Tambah modal':'Ambil modal',field('Jumlah (Rp)','amount','','number',true,true)+selectField('Akun','account',['Kas toko','Bank BCA'])+field('Catatan','note'));break;
case'expense-form':simpleForm('Tambah biaya',field('Catatan biaya','name','','text',true,true)+selectField('Kategori','category',['Listrik & air','Perlengkapan','Internet'])+field('Jumlah (Rp)','amount','','number',false,true)+selectField('Akun','account',['Kas toko','Bank BCA']));break;
case'expense-category':simpleForm('Kategori biaya',field('Nama kategori','name','','text',true,true));break;
case'reference-new':case'reference-edit':{const list=(refs[route]||[]).concat(referenceExtra[route]||[]);const existing=a==='reference-edit'?list[+b]:null;simpleForm(existing?'Edit data':'Tambah data',field('Nama','name',existing?.[0]||'','text',true,true)+field('Keterangan','description',existing?.[1]||'','text',true),'reference-form');$('#reference-form').dataset.index=existing?b:'';break}
case'store-edit':simpleForm('Identitas toko',field('Nama toko','name',storeName,'text',true,true)+field('Alamat','address','Jl. Merdeka No. 18','text',true));break;
case'member-add':case'member-edit':simpleForm(a==='member-add'?'Tambah anggota':'Akses '+b,field('Email anggota','email','','email',true,true)+selectField('Peran','role',['Kasir','Pengelola','Pemilik']));break;
case'disable-store':showDialog('Nonaktifkan toko','<div class="dialog-body"><p>Desain konfirmasi untuk tindakan penting. Penonaktifan tidak dijalankan pada prototype ini.</p></div>',button('Kembali','close','primary'));break;
case'password-form':case'two-factor':case'passkey':showDialog('Keamanan akun','<div class="dialog-body"><p>Tahap ini menampilkan penempatan dan struktur pengaturan. Jangan masukkan kata sandi atau kredensial asli ke prototype.</p></div>',button('Kembali','close','primary'));break;
case'plans':case'capacity':showDialog(a==='plans'?'Pilihan paket':'Kapasitas scan','<div class="dialog-body"><p>Rincian dan harga paket akan memakai data resmi aplikasi. Prototype tidak menjalankan pembelian.</p></div>',button('Kembali','close','primary'));break;
case'export-report':{const blob=new Blob(['Laporan contoh Sisko Plan\nPenjualan bersih: Rp18.625.000\nLaba kotor: Rp4.300.000\nEstimasi laba usaha: Rp3.815.000\nBukan data transaksi nyata.'],{type:'text/plain'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ringkasan-contoh.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);toast('Ringkasan contoh diunduh');break}
default:toast('Contoh interaksi · tidak mengubah aplikasi');
}
});
document.addEventListener('submit',e=>{
const f=e.target;

if(!(f instanceof HTMLFormElement)){
return;
}

e.preventDefault();const data=Object.fromEntries(new FormData(f));

switch(f.id){
case'product-form':{const p={...data,id:activeProduct?.id||Date.now(),short:data.name.slice(0,5).toUpperCase(),price:+data.price,cost:+data.cost,stock:+data.stock,min:+data.min,color:activeProduct?.color||'#eaca76'};

if(activeProduct){
Object.assign(activeProduct,p);
}else {
products.push(p);
}

activeProduct=null;navigate('products');toast('Produk contoh disimpan');break}
case'payment-form':{const paid=+data.paid,sum=total(cart);

if(paid<sum){
$('#payment-error').textContent='Uang diterima kurang '+money(sum-paid)+'.';break
}

showDialog('Transaksi contoh selesai','<div class="dialog-body paid-success">'+ic('check')+'<h2>Pembayaran tercatat</h2><p>Total '+money(sum)+'</p><p style="margin-top:12px">Kembalian <strong>'+money(paid-sum)+'</strong></p><p class="prototype-note" style="margin-top:18px">Simulasi saja · tidak ada pembayaran nyata</p></div>',button('Transaksi baru','new-sale','primary'));cart=[];render();break}
case'store-form':storeName=data['store-name'];navigate('stores');toast('Toko contoh dibuat');break;
case'profile-form':toast('Profil contoh disimpan untuk review');break;
case'reference-form':{if(f.dataset.index!==''){
const i=+f.dataset.index;

if(i<(refs[route]||[]).length){
refs[route][i]=[data.name,data.description];
}else {
referenceExtra[route][i-refs[route].length]=[data.name,data.description]
}
}else{
(referenceExtra[route]??=[]).push([data.name,data.description]);
}

closeDialog();render();toast('Data contoh disimpan');break}
case'adjust-form':{const p=products.find(p=>p.name===data['adjust-product']);p.stock=+data['adjust-qty'];closeDialog();render();toast('Stok contoh disesuaikan');break}
case'return-form':if(!Object.entries(data).some(([k,v])=>k.startsWith('return-')&&+v>0)){
toast('Pilih minimal satu barang yang dikembalikan');break
}

toast('Retur contoh diproses');navigate('sales');break;
default:closeDialog();toast('Catatan contoh disimpan · data produksi tidak berubah');
}
});
document.addEventListener('click',e=>{
if(e.target.closest('[data-action="new-sale"]')){
navigate('pos');
}

if(e.target.closest('a[href^="#"]')&&overlay.open){
closeDialog()
}
});
overlay.addEventListener('cancel',e=>{
e.preventDefault();

if(dialogStep==='review'){
cameraMode='photo';captureView(scanPurpose)
}else {
closeDialog()
}
});
window.addEventListener('hashchange',()=>{
closeDialog();search='';category='Semua kategori';viewState='normal';render();window.scrollTo(0,0)
});
window.addEventListener('message',e=>{
if(e.origin!==location.origin){
return;
}

if(e.data?.type==='review-state'){
viewState=e.data.value;render()
}
});
window.visualViewport?.addEventListener('resize',()=>{
document.body.classList.toggle('keyboard-open',window.innerHeight-window.visualViewport.height>150)
});
window.addEventListener('pagehide',stopCamera);
render();

overlay.addEventListener('click',e=>{
if(e.target===overlay&&overlay.classList.contains('nav-dropdown')){
const r=overlay.getBoundingClientRect();

if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){
closeDialog()
}
}
});
