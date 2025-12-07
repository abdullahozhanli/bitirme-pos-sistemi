const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// --- YENİ: YARDIMCI FONKSİYON ---
// (Category.js'teki fonksiyonun aynısı)
function capitalizeWords(str) {
  if (!str) return '';
  return str.split(' ')
    .map(word => 
      word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLowerCase()
    )
    .join(' '); 
}

// Bir "Ürün"ün veritabanında nasıl görüneceğini tanımlıyoruz
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    imageUrl: {
      type: String, 
      required: false,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    countInStock: {
      type: Number,
      required: true,
      default: 0,
    },
    station: {
      type: String,
      enum: ['hot', 'cold', 'bar', 'dessert'],
      default: 'hot',
      required: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: false, // Migration için opsiyonel, sonra required yapılabilir
    },
  },
  {
    timestamps: true,
  }
);

// İndeksler
productSchema.index({ branchId: 1 });
productSchema.index({ category: 1, branchId: 1 });

// --- YENİ: KAYDETMEDEN ÖNCE KANCASI (PRE-SAVE HOOK) ---
productSchema.pre('save', function(next) {
  // Sadece 'name' alanı değiştiyse veya yeniyse
  if (this.isModified('name')) {
    this.name = capitalizeWords(this.name);
  }
  // 'description' alanı değiştiyse (Opsiyonel: Açıklamayı da düzeltebiliriz)
  // if (this.isModified('description')) {
  //   this.description = capitalizeFirstLetter(this.description); // (Bu farklı bir fonksiyon gerektirir)
  // }
  next(); 
});


const Product = mongoose.model('Product', productSchema);

module.exports = Product;