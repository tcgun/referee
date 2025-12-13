# Firebase API ve Admin Key Nasıl Alınır?

Projeyi çalıştırmak için 2 farklı anahtar grubuna ihtiyacın var:
1. **Client Config** (Next.js ön yüzü için)
2. **Service Account Key** (Admin API ve Veri Girişi için)

Adım adım yapalım:

## 1. Firebase Projesi Oluşturma
1. [Firebase Console](https://console.firebase.google.com/) adresine git.
2. "Proje Ekle" (Add Project) de.
3. Proje adını gir (örn: `referee-app`) ve devam et.
4. Google Analytics'i kapatabilirsin (MVP için gerek yok).
5. "Proje Oluştur"a bas.

## 2. Firestore Veritabanını Açma
1. Sol menüden **Build > Firestore Database** seç.
2. "Veritabanı Oluştur" (Create Database) butonuna bas.
3. Konum olarak sana yakın bir yer (örn: `eur3` - Europe West) veya default `us-central1` seç.
4. Güvenlik kurallarını "Test modunda başlat" diyebilirsin (zaten `firestore.rules` dosyamızla koruyacağız).

## 3. Client Config (Ön Yüz Anahtarları)
1. Proje ana sayfasına (Project Overview) dön.
2. Üstte ortada **Web** simgesine (</>) tıkla.
3. Uygulama adı gir (örn: `referee-web`) ve "Register app" de.
4. Sana bir kod bloğu verecek (`const firebaseConfig = { ... }`).
5. O bloktaki değerleri `.env.local` dosyasındaki şu kısımlara yapıştır:

```ini
NEXT_PUBLIC_FIREBASE_API_KEY= "apiKey değerini buraya yapıştır"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN= "authDomain değerini buraya yapıştır"
NEXT_PUBLIC_FIREBASE_PROJECT_ID= "projectId değerini buraya yapıştır"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET= "storageBucket değerini buraya yapıştır"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID= "messagingSenderId değerini buraya yapıştır"
NEXT_PUBLIC_FIREBASE_APP_ID= "appId değerini buraya yapıştır"
```

## 4. Admin Service Account (Server Anahtarı)
Bu, veritabanına yazma yetkisi olan gizli anahtardır.

1. Sol menüden **Project Overview** yanındaki Çark (Settings) simgesine tıkla -> **Project settings**.
2. Üst sekmelerden **Service accounts**'a gel.
3. Alt tarafta **Generate new private key** butonuna tıkla.
4. İnen `.json` dosyasını aç.
5. İçindeki değerleri `.env.local` dosyasına al:

```ini
# Admin - Server Only
FIREBASE_PROJECT_ID= "project_id değerini buraya"
FIREBASE_CLIENT_EMAIL= "client_email değerini buraya"
FIREBASE_PRIVATE_KEY= "-----BEGIN PRIVATE KEY-----... (uzun anahtarın tamamını tırnak içine alarak yapıştır)"
ADMIN_KEY= "kendi-belirledigin-zor-bir-sifre-yaz"
```

## 5. ÖNEMLİ: Private Key Formatı
`.env.local` dosyasına `private_key`'i yapıştırırken, `.json` dosyasındaki `\n` (yeni satır) karakterlerinin bozulmadığından emin ol. Genellikle `.json` içindeki tek satır halini olduğu gibi tırnak içine (`" "`) yapıştırmak en iyisidir.

---

Bu işlemleri yaptıktan sonra terminalde `npm run dev` diyerek projeyi başlatabilirsin.
