const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Şifreleme için 'bcryptjs'i buraya import ediyoruz

// Bir "Kullanıcı"nın veritabanında nasıl görüneceğini tanımlıyoruz
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Lütfen bir e-posta adresi girin'], // Zorunlu
    unique: true, // Her e-posta benzersiz olmalı
    lowercase: true, // E-postayı otomatik olarak küçük harfe çevir
  },
  password: {
    type: String,
    required: false, // passwordHash kullanıldığı için opsiyonel
    minlength: 6, // Şifre en az 6 karakter olmalı
  },
  passwordHash: {
    type: String,
    required: false, // Eski kullanıcılar için opsiyonel
  },
  name: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    enum: ['admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'],
    default: 'musteri',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

// --- ŞİFRE HASHLEME (ŞİFRELEME) ---
// Bu, Mongoose'un "pre-save hook" (kaydetmeden-önce-kancası) özelliğidir.
// 'save' komutu çalışmadan (yani yeni kullanıcı kayıt olmadan) HEMEN ÖNCE araya girer.
userSchema.pre('save', async function (next) {
  // passwordHash değiştiyse veya yeni kullanıcıysa hashle
  if (this.isModified('passwordHash') && this.passwordHash && !this.passwordHash.startsWith('$2')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    } catch (error) {
      return next(error);
    }
  }
  
  // password değiştiyse veya yeni kullanıcıysa hashle (eski sistem uyumluluğu için)
  if (this.isModified('password') && this.password && !this.password.startsWith('$2')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      // passwordHash yoksa password'u passwordHash'e kopyala
      if (!this.passwordHash) {
        this.passwordHash = this.password;
      }
    } catch (error) {
      return next(error);
    }
  }

  next();
});

// Bu şemayı kullanarak 'User' adında bir model oluşturuyoruz
const User = mongoose.model('User', userSchema);

module.exports = User;