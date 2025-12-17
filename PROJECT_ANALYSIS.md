# Proje Analizi: RefereeLig

## Genel Bakış
**RefereeLig**, Süper Lig hakem performanslarını, tartışmalı pozisyonları, PFDK kararlarını ve kulüp açıklamalarını analiz edip sunan kapsamlı bir platformdur. Kullanıcılar, maç detaylarını, maç istatistiklerini, hakem kadrolarını ve yorumcu görüşlerini (Trio ve Genel) tek bir yerden takip edebilirler.

## Temel Özellikler

### 1. Ana Sayfa (Dashboard)
Kullanıcıların lig gündemini takip ettiği merkezi ekran:
*   **Trio Yorumları**: "Trio" programı yorumcularının maç pozisyonları hakkındaki görüşleri.
*   **Genel Yorumlar**: Diğer spor yorumcularının değerlendirmeleri.
*   **PFDK Kararları**: Profesyonel Futbol Disiplin Kurulu'nun verdiği cezalar.
*   **Açıklamalar**: TFF ve kulüplerden gelen resmi açıklamalar.
*   **Puan Durumu**: Lig sıralaması ve detaylı istatistikler.

### 2. Maç Detayları
Her maç için özel sayfalar:
*   **Maç Bilgileri**: Skor, tarih, stadyum, hafta bilgisi.
*   **Hakem Kadrosu**: Orta hakem, yardımcılar, 4. hakem, VAR, AVAR, gözlemci ve temsilciler.
*   **İstatistikler**: Topla oynama, şut, pas, faul, kart dağılımı vb.
*   **Kadrolar**: İlk 11, yedekler ve teknik direktörler.

### 3. Yönetim Paneli (Admin Secret Panel)
İçerik girişinin yapıldığı yönetim arayüzü:
*   Maç ekleme/düzenleme.
*   Trio ve genel yorum ekleme.
*   PFDK kararları ve açıklamaları yönetme.
*   Puan durumu güncelleme.
*   Takım yönetimi.

## Veri Mimarisi (Data Models)

Proje Firebase Firestore üzerinde aşağıdaki temel veri yapılarını kullanmaktadır:
*   **Match (Maçlar)**: Ev sahibi/deplasman takımları, skor, hakemler, detaylı istatistikler ve kadrolar.
*   **Opinion (Görüşler)**: Hakem kararları üzerine yorumcu görüşleri (Doğru/Hatalı/Tartışmalı).
*   **Standing (Puan Durumu)**: Takımların ligdeki performans verileri (O, G, B, M, AG, YG, AV, P).
*   **Statement (Açıklamalar)**: Kulüp veya federasyon açıklamaları.
*   **DisciplinaryAction (Disiplin)**: Cezalar ve gerekçeleri.
*   **Team (Takımlar)**: Takım adları, renkleri ve logoları.

## Teknolojik Altyapı
*   **Framework**: Next.js 16 (App Router)
*   **Dil**: TypeScript
*   **Veritabanı**: Google Firebase (Firestore)
*   **Stil**: Tailwind CSS v4 + PostCSS
*   **İkon Seti**: Lucide React
*   **Paket Yöneticisi**: npm

## Proje Durumu
Proje şu anda geliştirme aşamasındadır. Temel kullanıcı arayüzü ve admin paneli fonksiyonları kurgulanmıştır. Veriler şu an için demo amaçlı girilmektedir ancak altyapı gerçek verileri taşıyabilecek şekilde tasarlanmıştır. Güvenlik ve veri doğrulama (Zod) katmanları mevcuttur.
