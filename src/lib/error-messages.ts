export type ErrorInfo = {
  /** Apa yang terjadi, dalam bahasa staf. */
  title: string;
  /** Langkah perbaikan yang bisa dilakukan user. */
  action: string;
  /** Opsional: halaman tempat perbaikan dilakukan. */
  href?: string;
  hrefLabel?: string;
};

const INTEGRASI = { href: "/integrasi", hrefLabel: "Buka Integrasi" } as const;
const MASTER = { href: "/master", hrefLabel: "Buka Master Data" } as const;
const KONTEN = { href: "/konten", hrefLabel: "Buka Riwayat Konten" } as const;
const ADMIN = "Hubungi Admin untuk menyelesaikan konfigurasi.";

export const ERROR_MESSAGES: Record<string, ErrorInfo> = {
  // Sesi & hak akses
  UNAUTHORIZED: { title: "Sesi login sudah berakhir.", action: "Muat ulang halaman lalu login kembali dengan akun Google.", href: "/login", hrefLabel: "Login" },
  FORBIDDEN: { title: "Role Anda tidak memiliki izin untuk aksi ini.", action: "Minta Admin memberi role atau izin yang sesuai di Pengaturan." },
  SELF_ADMIN_PROTECTION: { title: "Anda tidak bisa menurunkan role atau menonaktifkan akun Admin Anda sendiri.", action: "Minta Admin lain melakukan perubahan ini." },
  USER_NOT_FOUND: { title: "User tidak ditemukan.", action: "Muat ulang halaman Pengaturan lalu coba lagi." },
  USER_UPDATE_FAILED: { title: "Perubahan user gagal disimpan.", action: "Periksa isian lalu coba lagi." },

  // Konfigurasi runtime
  DATABASE_NOT_CONFIGURED: { title: "Database Neon belum terhubung.", action: ADMIN, ...INTEGRASI },
  GOOGLE_SHEETS_NOT_CONFIGURED: { title: "Google Sheet Register/Content Bridge belum dikonfigurasi.", action: ADMIN, ...INTEGRASI },
  GOOGLE_SHEETS_IDS_NOT_CONFIGURED: { title: "ID Google Sheet belum dikonfigurasi.", action: ADMIN, ...INTEGRASI },
  REGISTER_NOT_CONFIGURED: { title: "Register pekerja belum dikonfigurasi.", action: ADMIN, ...INTEGRASI },
  BRIDGE_NOT_CONFIGURED: { title: "Content Bridge belum dikonfigurasi.", action: ADMIN, ...INTEGRASI },
  PHOTO_NOT_CONFIGURED: { title: "Folder foto Google Drive belum dikonfigurasi.", action: ADMIN, ...INTEGRASI },
  EXPORT_FOLDER_NOT_CONFIGURED: { title: "Folder arsip export di Google Drive belum disiapkan.", action: "Admin perlu menjalankan health check Google dan menyiapkan folder export.", ...INTEGRASI },
  CANVA_OAUTH_NOT_CONFIGURED: { title: "Kredensial Canva belum dikonfigurasi.", action: ADMIN, ...INTEGRASI },
  WORKER_TEMPLATES_NOT_CONFIGURED: { title: "Template Canva pekerja belum tersedia di Master Data.", action: "Admin perlu menambahkan template MB-01A/MB-01B lalu menjalankan health check.", ...MASTER },

  // Koneksi akun
  GOOGLE_NOT_CONNECTED: { title: "Akun Google Anda belum terhubung ke aplikasi.", action: "Logout lalu login kembali dengan Google, setujui akses Sheets & Drive.", href: "/lainnya", hrefLabel: "Logout" },
  GOOGLE_RECONNECT_REQUIRED: { title: "Akses Google Anda sudah kedaluwarsa.", action: "Logout lalu login kembali dengan Google untuk memperbarui akses.", href: "/lainnya", hrefLabel: "Logout" },
  GOOGLE_REFRESH_FAILED: { title: "Akses Google tidak bisa diperbarui.", action: "Logout lalu login kembali dengan Google.", href: "/lainnya", hrefLabel: "Logout" },
  GOOGLE_HEALTH_FAILED: { title: "Pemeriksaan koneksi Google gagal.", action: "Pastikan akun Anda punya akses ke Register, Content Bridge, dan folder Drive, lalu coba lagi.", ...INTEGRASI },
  GOOGLE_PROVISION_FAILED: { title: "Folder Google Drive gagal disiapkan.", action: "Pastikan akun Anda punya akses edit ke folder induk, lalu coba lagi.", ...INTEGRASI },
  CANVA_NOT_CONNECTED: { title: "Akun Canva Anda belum terhubung.", action: "Hubungkan akun Canva di menu Integrasi.", ...INTEGRASI },
  CANVA_RECONNECT_REQUIRED: { title: "Akses Canva Anda sudah kedaluwarsa.", action: "Hubungkan ulang akun Canva di menu Integrasi.", ...INTEGRASI },
  CANVA_REFRESH_FAILED: { title: "Akses Canva tidak bisa diperbarui.", action: "Hubungkan ulang akun Canva di menu Integrasi.", ...INTEGRASI },
  CANVA_TOKEN_EXCHANGE_FAILED: { title: "Proses menghubungkan Canva gagal.", action: "Ulangi Hubungkan Canva dari menu Integrasi.", ...INTEGRASI },
  CANVA_HEALTH_FAILED: { title: "Pemeriksaan template Canva gagal.", action: "Pastikan akun Canva masih terhubung lalu jalankan ulang health check.", ...INTEGRASI },

  // Register & pekerja
  WORKER_NOT_FOUND: { title: "Pekerja tidak ditemukan di Register.", action: "Periksa kembali nomor register, lalu cari ulang dari menu Pekerja.", href: "/pekerja", hrefLabel: "Cari Pekerja" },
  REGISTER_READ_FAILED: { title: "Register pekerja tidak bisa dibaca.", action: "Pastikan akun Google Anda punya akses ke Register, lalu coba lagi." },
  SEARCH_FAILED: { title: "Pencarian Register gagal.", action: "Periksa koneksi internet lalu coba lagi." },
  LOAD_FAILED: { title: "Data gagal dimuat.", action: "Periksa koneksi internet lalu muat ulang halaman." },

  // Enrichment & master
  ENRICHMENT_READ_FAILED: { title: "Data enrichment di Content Bridge tidak bisa dibaca.", action: "Pastikan akun Google Anda punya akses ke Content Bridge, lalu coba lagi." },
  ENRICHMENT_WRITE_FAILED: { title: "Data enrichment gagal disimpan ke Content Bridge.", action: "Pastikan akun Google Anda punya akses edit ke Content Bridge, lalu simpan lagi." },
  ENRICHMENT_NOT_FOUND: { title: "Data enrichment pekerja belum ada.", action: "Lengkapi dan simpan data pekerja terlebih dahulu." },
  SAVE_FAILED: { title: "Data gagal disimpan.", action: "Periksa koneksi internet lalu simpan lagi." },
  INVALID_INPUT: { title: "Ada isian yang tidak valid.", action: "Periksa kembali isian yang ditandai lalu coba lagi." },
  INVALID_SKILL: { title: "Ada keahlian yang sudah tidak aktif.", action: "Muat ulang halaman lalu pilih ulang keahlian." },
  RATE_NOT_FOUND: { title: "Rate gaji untuk kombinasi kategori, pengalaman, dan penempatan ini belum ada.", action: "Admin perlu menambahkan Rate Gaji yang sesuai di Master Data.", ...MASTER },
  RATE_REFERENCE_NOT_FOUND: { title: "Referensi rate gaji tidak ditemukan.", action: "Admin perlu memeriksa kategori, pengalaman, dan zona di Master Data.", ...MASTER },
  SALARY_ZONE_NOT_FOUND: { title: "Zona gaji untuk penempatan ini belum diatur.", action: "Admin perlu mengatur zona gaji penempatan di Master Data.", ...MASTER },
  MASTER_DATA_UNAVAILABLE: { title: "Master Data belum tersedia.", action: "Admin perlu menjalankan migrasi dan seed Master Data.", ...MASTER },
  MASTER_READ_FAILED: { title: "Master Data gagal dimuat.", action: "Muat ulang halaman. Jika berulang, periksa koneksi Neon.", ...INTEGRASI },
  MASTER_WRITE_FAILED: { title: "Perubahan Master Data gagal disimpan.", action: "Periksa isian lalu coba lagi." },
  INVALID_MASTER_INPUT: { title: "Isian Master Data tidak valid.", action: "Kode wajib huruf besar/angka/garis bawah, dan nama wajib diisi." },
  INVALID_MAPPING_INPUT: { title: "Isian mapping tidak valid.", action: "Isi nilai sumber dan pilih kode target yang aktif." },
  INVALID_RATE_RANGE: { title: "Rentang gaji tidak valid.", action: "Pastikan gaji minimum tidak lebih besar dari gaji maksimum." },
  INVALID_TEMPLATE_INPUT: { title: "Isian template tidak valid.", action: "Periksa kode, design ID, dan versi template." },
  INVALID_CHANNEL_INPUT: { title: "Isian channel tidak valid.", action: "Periksa kode dan nama channel." },
  INVALID_CTA_INPUT: { title: "Isian CTA tidak valid.", action: "Periksa nama, nomor, dan teks CTA." },
  INVALID_DISPLAY_KEY: { title: "Label tampilan tidak dikenal.", action: "Muat ulang halaman lalu coba lagi." },
  INVALID_DISPLAY_VALUE: { title: "Teks label tampilan tidak valid.", action: "Isi teks label dengan panjang yang wajar." },
  DISPLAY_LABEL_REQUIRED: { title: "Label tampilan wajib diisi.", action: "Isi teks label sebelum menyimpan." },
  INVALID_COPY_PRESETS: { title: "Rekomendasi teks tidak valid.", action: "Pastikan setiap baris berisi teks (maks. 160 karakter, maks. 20 baris), lalu simpan lagi." },
  CTA_NOT_FOUND: { title: "CTA tidak ditemukan.", action: "Muat ulang halaman Master Data lalu coba lagi." },

  // Foto
  INVALID_PHOTO: { title: "File foto tidak valid.", action: "Gunakan foto JPG, PNG, atau WebP maksimal 12 MB." },
  UNSUPPORTED_TYPE: { title: "Format foto tidak didukung.", action: "Gunakan foto JPG, PNG, atau WebP." },
  INVALID_SIZE: { title: "Ukuran foto terlalu besar.", action: "Gunakan foto maksimal 12 MB." },
  PREPARED_IMAGE_TOO_LARGE: { title: "Foto hasil kompresi masih terlalu besar.", action: "Pilih foto dengan resolusi lebih kecil lalu coba lagi." },
  UPLOAD_FAILED: { title: "Foto gagal diunggah.", action: "Periksa koneksi internet lalu unggah ulang." },
  PHOTO_UPLOAD_FAILED: { title: "Foto gagal diunggah ke Google Drive.", action: "Periksa koneksi internet lalu unggah ulang." },
  DRIVE_UPLOAD_FAILED: { title: "Google Drive menolak unggahan foto.", action: "Pastikan akun Anda punya akses edit ke folder foto, lalu unggah ulang." },
  PHOTO_NOT_FOUND: { title: "Foto profil belum ada.", action: "Unggah foto profil di halaman detail pekerja." },
  PHOTO_READ_FAILED: { title: "Foto tidak bisa dibaca dari Google Drive.", action: "Periksa akses Drive Anda lalu muat ulang halaman." },
  DRIVE_READ_FAILED: { title: "File di Google Drive tidak bisa dibaca.", action: "Periksa akses Drive Anda lalu coba lagi." },
  DRIVE_PHOTO_DOWNLOAD_FAILED: { title: "Foto profil tidak bisa diambil dari Google Drive.", action: "Pastikan foto masih ada dan akun Anda punya akses, lalu coba lagi." },

  // Workflow konten
  READINESS_INCOMPLETE: { title: "Data pekerja belum lengkap.", action: "Lengkapi semua data wajib dan foto profil sebelum menyetujui konten." },
  APPROVAL_FAILED: { title: "Persetujuan konten gagal.", action: "Muat ulang halaman lalu coba lagi." },
  CONTENT_NOT_APPROVED: { title: "Konten belum disetujui.", action: "Admin perlu menyetujui konten sebelum Generate." },
  PROFILE_PHOTO_REQUIRED: { title: "Foto profil belum diunggah.", action: "Unggah foto profil di halaman detail pekerja sebelum Generate." },
  TEMPLATE_NOT_ACTIVE: { title: "Template Canva yang dipilih belum aktif.", action: "Admin perlu menjalankan health check template di menu Integrasi.", ...INTEGRASI },
  TEMPLATE_UNHEALTHY: { title: "Template Canva tidak lengkap, sehingga dinonaktifkan.", action: "Admin perlu melengkapi field Autofill di Canva lalu menjalankan ulang health check.", ...INTEGRASI },
  GENERATION_FAILED: { title: "Pembuatan desain di Canva gagal.", action: "Coba Generate ulang. Jika berulang, periksa koneksi Canva.", ...INTEGRASI },
  GENERATION_JOB_MISSING: { title: "Job pembuatan desain tidak tercatat.", action: "Coba Generate ulang.", ...KONTEN },
  GENERATION_STATUS_FAILED: { title: "Status pembuatan desain tidak bisa dicek.", action: "Cek hasilnya di menu Konten beberapa saat lagi.", ...KONTEN },
  GENERATION_POLL_TIMEOUT: { title: "Canva masih memproses desain.", action: "Proses tetap berjalan. Cek hasilnya di menu Konten beberapa saat lagi.", ...KONTEN },
  JOB_NOT_FOUND: { title: "Job pembuatan desain tidak ditemukan.", action: "Coba Generate ulang.", ...KONTEN },
  CANVA_AUTOFILL_FAILED: { title: "Canva gagal mengisi template.", action: "Periksa isian profil publik (panjang teks) lalu Generate ulang." },
  CANVA_ASSET_UPLOAD_FAILED: { title: "Foto gagal diunggah ke Canva.", action: "Coba Generate ulang." },
  CANVA_ASSET_UPLOAD_TIMEOUT: { title: "Unggahan foto ke Canva terlalu lama.", action: "Coba Generate ulang beberapa saat lagi." },
  CANVA_DESIGN_NOT_FOUND: { title: "Desain Canva hasil generate tidak ditemukan.", action: "Generate ulang desainnya." },
  CONTENT_NOT_GENERATED: { title: "Desain belum dibuat.", action: "Jalankan Generate terlebih dahulu sebelum Export." },
  CONTENT_NOT_FOUND: { title: "Data konten pekerja tidak ditemukan.", action: "Lengkapi data pekerja terlebih dahulu." },
  EXPORT_FAILED: { title: "Export PNG ke Google Drive gagal.", action: "Coba Export ulang." },
  CANVA_EXPORT_FAILED: { title: "Canva gagal mengekspor PNG.", action: "Coba Export ulang." },
  CANVA_EXPORT_TIMEOUT: { title: "Export dari Canva terlalu lama.", action: "Coba Export ulang beberapa saat lagi." },
  CANVA_EXPORT_DOWNLOAD_FAILED: { title: "File PNG dari Canva tidak bisa diunduh.", action: "Coba Export ulang." },
  EXPORT_REQUIRED_BEFORE_PUBLISH: { title: "PNG final belum diarsipkan ke Drive.", action: "Jalankan Export PNG ke Drive sebelum menandai publikasi." },
  INVALID_PUBLISH_CHANNEL: { title: "Channel publikasi tidak aktif.", action: "Pilih channel lain atau minta Admin mengaktifkannya di Master Data.", ...MASTER },
  PUBLISH_FAILED: { title: "Status publikasi gagal disimpan.", action: "Coba lagi." },
};

/** Ambil kode error dari string seperti "DRIVE_UPLOAD_FAILED:403" atau "TEMPLATE_UNHEALTHY — ...". */
export function normalizeErrorCode(code: string) {
  return code.trim().split(/[:\s—]/)[0] ?? "";
}

export function getErrorInfo(code: string | null | undefined): ErrorInfo {
  const raw = String(code ?? "").trim();
  const known = ERROR_MESSAGES[normalizeErrorCode(raw)];
  if (known) return known;
  // Pesan yang sudah berbahasa manusia (mis. dari validasi foto) dipakai apa adanya.
  if (raw && !/^[A-Z0-9_]+(?:[:\s].*)?$/.test(raw)) return { title: raw, action: "Periksa kembali lalu coba lagi." };
  return { title: `Terjadi kesalahan${raw ? ` (${normalizeErrorCode(raw)})` : ""}.`, action: "Coba lagi. Jika berulang, hubungi Admin dengan menyebut kode ini." };
}
