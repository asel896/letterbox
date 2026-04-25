const morgan = require('morgan'); 


const express = require('express');
const cors = require('cors'); // frontend baglantisi icin cors
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors()); // Güvenlik duvarını esnetir, frontend bağlantısına izin verir
app.use(morgan('dev')); // HTTP isteklerini loglamak için morgan kullanıyoruz. sunucuya gelen istekleri terminalde görebiliriz. 
app.use(express.json()); // JSON verilerini okumamızı sağlar


app.get('/', (req, res) => {
  res.send('Sine Kritik Backend is running!');
});



// Tüm filmleri listeleme
app.get('/filmler', async (req, res) => {
  try {
    // pool.query ile veritabanına SQL sorgusu gönderiyoruz
    const tumFilmler = await pool.query('SELECT * FROM filmler ORDER BY puan DESC');
    
    // Gelen sonucun içindeki "rows" (satırlar) kısmını JSON olarak döndürüyoruz
    res.json(tumFilmler.rows);
  } catch (err) {
    // Bir hata olursa terminale yazdır ve kullanıcıya hata mesajı ver
    console.error(err.message);
    res.status(500).send("Veritabanı bağlantısında bir sorun oluştu.");
  }
});



// Rastgele bir film getirir
app.get('/filmler/rastgele', async (req, res) => {
  try {
    // RANDOM() fonksiyonu ile rastgele 1 satır seçiyoruz
    const rastgeleFilm = await pool.query(
      'SELECT * FROM filmler ORDER BY RANDOM() LIMIT 1'
    );
    
    if (rastgeleFilm.rows.length === 0) {
      return res.status(404).send("Veritabanı şu an boş, önce film ekle!");
    }
    
    res.json(rastgeleFilm.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Rastgele film seçilirken bir hata oluştu.");
  }
});



// Belirli bir türe göre filmleri getirir
app.get('/filmler/tur/:turIsmi', async (req, res) => {
  try {
    const { turIsmi } = req.params; // URL'deki tür ismini yakala
    
    // ILIKE kullanarak büyük/küçük harf duyarsız arama yapıyoruz
    const filmler = await pool.query(
      'SELECT * FROM filmler WHERE tur ILIKE $1 ORDER BY puan DESC',
      [turIsmi]
    );

    if (filmler.rows.length === 0) {
      return res.status(404).json({ message: "Bu türde henüz bir film bulunmuyor." });
    }

    res.json(filmler.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Filtreleme sırasında bir hata oluştu.");
  }
});



// Film ismine göre arama yapma 
app.get('/filmler/ara/sorgu', async (req, res) => {
  try {
    const { isim } = req.query; // URL'den ?isim=... kısmını alır
    
    const sonuclar = await pool.query(
      'SELECT * FROM filmler WHERE film_adi ILIKE $1',
      [`%${isim}%`] // % işareti "içinde geçen her şeyi bul" demektir
    );

    res.json(sonuclar.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Arama sırasında bir hata oluştu.");
  }
});



// Yeni film eklemek için 
app.post('/filmler', async (req, res) => {
  try {
    // 1. Gelen verileri alıyoruz
    const { film_adi, yonetmen, puan, tur } = req.body;

    // 2. Veritabanına güvenli sorgu gönderiyoruz
    // VALUES kısmındaki $1, $2, $3 ikinci parametredeki diziden sırayla verileri çeker
    const yeniFilm = await pool.query(
      'INSERT INTO filmler (film_adi, yonetmen, puan, tur) VALUES ($1, $2, $3, $4) RETURNING *',
      [film_adi, yonetmen, puan, tur]
    );

    // 3. Eklenen filmi geri gönderiyoruz (Başarı mesajı yerine datayı dönmek daha iyidir)
    res.json(yeniFilm.rows[0]);

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Film eklenirken bir hata oluştu.");
  }
});







//Silme islemleri icin id'ye gore silme yapacagiz. URL'de /filmler/:id seklinde id'yi aliyoruz.
app.delete('/filmler/:id', async (req, res) => { 
  try { 
    const { id } = req.params;
    await pool.query('DELETE FROM filmler WHERE id = $1', [id]);
    res.json({ message: 'Film başarıyla silindi.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Film silinirken bir hata oluştu.");
  }
});






app.put('/filmler/:id', async (req, res) => {
  try {
    const { id } = req.params;  // adresten ID'yi al
    const { film_adi, yonetmen, puan, tur } = req.body; // yeni bilgileri al

    const guncellenenFilm = await pool.query(
      'UPDATE filmler SET film_adi = $1, yonetmen = $2, puan = $3, tur = $4 WHERE id = $5 RETURNING *',
      [film_adi, yonetmen, puan, tur, id]
    );

    res.json(guncellenenFilm.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Film güncellenirken bir hata oluştu.");
  }
});




// Global Hata Yakalayıcı
app.use((err, req, res, next) => {
  console.error("Beklenmedik bir hata oluştu:", err.stack);
  res.status(500).json({ error: "Sunucu tarafında bir sorun var!" });
});



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});