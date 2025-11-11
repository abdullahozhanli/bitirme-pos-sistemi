const mongoose = require('mongoose');

// --- YENİ: YARDIMCI FONKSİYON ---
// Görevi: "içli köfte" -> "İçli Köfte" yapmak
// (Türkçe 'i' harfini 'İ' yapabilmesi için .toLocaleUpperCase('tr-TR') kullanıyoruz)
function capitalizeWords(str) {
  if (!str) return '';
  return str.split(' ') // 1. Kelimelere ayır: ['içli', 'köfte']
    .map(word => 
      // 2. Her kelimenin ilk harfini BÜYÜT, kalanını küçült: 'İçli', 'Köfte'
      word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLowerCase()
    )
    .join(' '); // 3. Tekrar birleştir: 'İçli Köfte'
}

// Bir "Kategori"nin veritabanında nasıl görüneceğini tanımlıyoruz
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String, 
      required: true, 
      unique: true, 
    },
  },
  {
    timestamps: true,
  }
);

// --- YENİ: KAYDETMEDEN ÖNCE KANCASI (PRE-SAVE HOOK) ---
// 'save' (kaydet) komutu çalışmadan HEMEN ÖNCE araya girer
categorySchema.pre('save', function(next) {
  // Sadece 'name' alanı değiştiyse veya yeniyse bu kancayı çalıştır
  if (this.isModified('name')) {
    // 'name' alanını, yardımcı fonksiyondan geçirerek güncelle
    this.name = capitalizeWords(this.name);
  }
  next(); // Bir sonraki adıma (asıl kaydetme) geç
});


const Category = mongoose.model('Category', categorySchema);

module.exports = Category;