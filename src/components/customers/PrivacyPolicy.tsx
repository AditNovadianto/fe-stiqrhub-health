import { useState } from "react";

import {
    ArrowUp,
    CalendarDays,
    ChevronDown,
    FileLock2,
    Mail,
    MapPin,
    ShieldCheck,
} from "lucide-react";

interface PrivacySection {
    id: string;
    title: string;
    paragraphs?: string[];
    points?: string[];
}

const privacySections: PrivacySection[] = [
    {
        id: "pasal-1",
        title: "PASAL 1: PERSETUJUAN DAN DASAR PEMROSESAN DATA",
        points: [
            "Kami memproses Data Pribadi Anda berdasarkan persetujuan eksplisit, pelaksanaan kewajiban kontraktual (penerbitan Health Pass), kewajiban hukum, serta kepentingan sah operasional platform.",
            "Anda dapat menarik persetujuan Pemrosesan Data Pribadi sewaktu-waktu melalui fitur Help Center atau email resmi Kami. Penarikan persetujuan dapat mengakibatkan penghentian layanan atau ketidakmampuan Kami memproses transaksi Health Pass Anda.",
            "Apabila Anda mendaftarkan data pribadi orang lain (seperti keluarga/pasien di bawah umur 18 tahun), Anda menjamin telah memperoleh izin/konsen sah dari yang bersangkutan atau bertindak selaku orang tua/wali sah.",
        ],
    },
    {
        id: "pasal-2",
        title: "PASAL 2: PENGUMPULAN DATA PRIBADI",
        paragraphs: [
            "Kami mengumpulkan Data Pribadi yang Anda berikan secara langsung maupun yang terkumpul secara otomatis melalui sistem:",
        ],
        points: [
            "Data Identitas Pembeli & Pasien: Alamat email unik (sebagai identitas utama dan verifikasi OTP), nomor telepon, Nama Lengkap Pasien (sesuai KTP/SIM/Paspor), dan Tanggal Lahir.",
            "Data Transaksi & Pembayaran: Riwayat pemesanan Health Pass, nilai transaksi, metode pembayaran (via DANA/Payment Gateway), status penukaran (Redemption), serta lokasi cabang klinik mitra pilihan.",
            "Data Teknis & Perangkat: Alamat IP, jenis perangkat, log aktivitas sistem, cookie, serta informasi sesi masuk (login session yang berlaku selama 24 jam).",
        ],
    },
    {
        id: "pasal-3",
        title: "PASAL 3: TUJUAN PENGGUNAAN DATA PRIBADI",
        paragraphs: [
            "Data Pribadi Anda diproses secara terbatas untuk tujuan:",
        ],
        points: [
            "Mengelola registrasi akun, verifikasi keamanan kode OTP, dan menjaga keamanan sesi masuk (login session).",
            "Memproses transaksi pembayaran, menerbitkan kode QR unik Health Pass, serta mengirimkan konfirmasi dan pengingat masa berlaku voucher.",
            "Memfasilitasi pencocokan identitas dan verifikasi kehadiran Pasien saat pendaftaran di lokasi fasilitas pelayanan kesehatan mitra (Penyedia Layanan).",
            "Mengelola layanan pelanggan, menyelesaikan hambatan operasional/sistem, serta menanggapi laporan keluhan pelayanan.",
            "Memenuhi kewajiban hukum, audit keuangan, dan kepatuhan terhadap regulasi di Indonesia.",
        ],
    },
    {
        id: "pasal-4",
        title: "PASAL 4: PEMBAGIAN DAN PENGUNGKAPAN DATA PRIBADI",
        paragraphs: [
            "Kami tidak pernah menjual atau menyewakan Data Pribadi Anda. Data hanya dibagikan dalam kondisi terbatas:",
        ],
        points: [
            "Kepada Penyedia Layanan (Klinik Mitra): Diteruskan hanya berupa Nama Lengkap dan Tanggal Lahir Pasien untuk pendaftaran rekam medis fisik di lokasi klinik. Alamat email Pembeli tidak dibagikan.",
            "Kepada Mitra Pemroses Pembayaran (DANA / Payment Gateway / Infrastructure Provider): Terbatas pada data transaksi untuk pemrosesan pembayaran dan ketersediaan sistem.",
            "Kepada Otoritas Hukum: Apabila dipersyaratkan oleh peraturan perundang-undangan, perintah pengadilan, atau instansi pemerintah yang berwenang.",
        ],
    },
    {
        id: "pasal-5",
        title: "PASAL 5: PERBEDAAN DATA PLATFORM DAN REKAM MEDIS",
        points: [
            "Peran Platform: STIQR Health hanya berwenang memproses data transaksi digital dan bukti hak layanan (Health Pass).",
            "Pengecualian Rekam Medis: STIQR Health tidak pernah mengumpulkan, meminta, atau menyimpan Rekam Medis (seperti riwayat diagnosis, tindakan medis, resep obat, atau riwayat pemeriksaan) milik Pasien. Seluruh rekam medis sepenuhnya dibuat, disimpan, dan dikelola mandiri oleh Penyedia Layanan (Klinik Mitra) sesuai hukum kesehatan.",
        ],
    },
    {
        id: "pasal-6",
        title: "PASAL 6: HAK PENGGUNA SEBAGAI SUBJEK DATA (UU PDP)",
        paragraphs: [
            "Sesuai UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi, Anda berhak untuk:",
        ],
        points: [
            "Mengakses, memperbarui, atau mengoreksi data pribadi Anda yang tidak akurat.",
            "Meminta pemusnahan/penghapusan data pribadi Anda atau menarik kembali persetujuan pemrosesan data, sepanjang tidak bertentangan dengan retensi data yang diwajibkan hukum.",
        ],
    },
    {
        id: "pasal-7",
        title: "PASAL 7: KERAHASIAAN DAN KEAMANAN DATA",
        points: [
            "Kami menerapkan pengamanan teknis, administrasi, dan fisik (termasuk enkripsi data) guna melindungi data dari risiko kebocoran, penyalahgunaan, atau akses tanpa hak.",
            "Anda bertanggung jawab penuh atas kerahasiaan perangkat pribadi, alamat email, dan kode OTP Anda. Kami tidak pernah meminta kode OTP melalui media apa pun.",
        ],
    },
    {
        id: "pasal-8",
        title: "PASAL 8: PERUBAHAN PEMBERITAHUAN PRIVASI",
        points: [
            "Kami berhak meninjau dan mengubah Pemberitahuan Privasi ini sewaktu-waktu. Perubahan material akan diberitahukan melalui push notification pada platform atau email resmi sekurang-kurangnya 7 (tujuh) hari kalender sebelum tanggal berlaku.",
        ],
    },
    {
        id: "pasal-9",
        title: "PASAL 9: INFORMASI LEBIH LANJUT DAN BANTUAN",
        paragraphs: [
            "Apabila Anda memiliki pertanyaan, keluhan, atau ingin menggunakan hak-hak perlindungan data pribadi Anda, silakan hubungi Kami melalui:",
        ],
    },
];

const PrivacyPolicy = () => {
    const [showTableOfContents, setShowTableOfContents] =
        useState(false);

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });

        setShowTableOfContents(false);
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    return (
        <div className="min-h-screen bg-[#F5F8FC] text-[#002C65]">
            <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-5 sm:px-6">
                <section className="rounded-2xl border border-[#D8E4F2] bg-white p-5 sm:p-7">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0872E5]">
                        <FileLock2 size={25} strokeWidth={1.8} />
                    </div>

                    <h2 className="mt-5 text-[23px] font-bold leading-tight tracking-tight text-[#00357A] sm:text-[27px]">
                        Kebijakan Privasi STIQR Health
                    </h2>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#526787]">
                        <CalendarDays
                            size={15}
                            className="shrink-0 text-[#0872E5]"
                        />

                        <span>
                            Berlaku sejak tanggal:
                            <strong className="ml-1 text-[#00357A]">
                                27 Oktober 2026
                            </strong>
                        </span>
                    </div>

                    <div className="mt-6 space-y-4 text-[13px] leading-[1.85] text-slate-700 sm:text-sm">
                        <p>
                            Pemberitahuan Privasi ini menjelaskan bagaimana
                            PT Digital Nusantara Sinergi ("Kami" atau
                            "STIQR Health") memperoleh, mengumpulkan,
                            mengolah, menganalisis, menyimpan, memperbarui,
                            menampilkan, mentransfer, menghapus, dan/atau
                            memusnahkan, serta melindungi data pribadi
                            ("Pemrosesan Data Pribadi") milik Anda
                            ("Anda" atau "Pengguna/Pasien"), baik saat
                            mengakses aplikasi, situs web, maupun Mini
                            Program STIQR Health pada aplikasi DANA.
                        </p>

                        <p>
                            Dengan mendaftar, mengakses, atau membeli
                            paket Health Pass, Anda menyatakan telah
                            membaca, memahami, dan menyetujui seluruh
                            ketentuan dalam Kebijakan Privasi ini.
                        </p>
                    </div>
                </section>

                <section className="mt-4 overflow-hidden rounded-2xl border border-[#D8E4F2] bg-white">
                    <button
                        type="button"
                        onClick={() =>
                            setShowTableOfContents((prev) => !prev)
                        }
                        aria-expanded={showTableOfContents}
                        aria-controls="privacy-toc"
                        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
                    >
                        <div>
                            <h2 className="text-sm font-bold text-[#00357A]">
                                Daftar Isi
                            </h2>

                            <p className="mt-1 text-xs text-[#526787]">
                                Pilih pasal untuk membaca ketentuannya
                            </p>
                        </div>

                        <ChevronDown
                            size={19}
                            className={`shrink-0 text-[#0872E5] transition-transform ${showTableOfContents ? "rotate-180" : ""
                                }`}
                        />
                    </button>

                    {showTableOfContents && (
                        <nav
                            id="privacy-toc"
                            aria-label="Daftar isi Kebijakan Privasi"
                            className="border-t border-[#E6EDF6] px-5 py-2"
                        >
                            {privacySections.map((section, index) => (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => scrollToSection(section.id)}
                                    className="flex w-full cursor-pointer items-start gap-3 border-b border-slate-100 py-3 text-left last:border-b-0 hover:text-blue-600"
                                >
                                    <span className="w-6 shrink-0 text-xs font-bold text-[#0872E5]">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>

                                    <span className="text-xs font-medium leading-relaxed text-[#00357A]">
                                        {section.title}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    )}
                </section>

                <div className="mt-4 space-y-4">
                    {privacySections.map((section, sectionIndex) => (
                        <section
                            key={section.id}
                            id={section.id}
                            className="scroll-mt-20 rounded-2xl border border-[#D8E4F2] bg-white p-5 sm:p-7"
                            aria-labelledby={`${section.id}-title`}
                        >
                            {/* ARTICLE NUMBER */}
                            <div className="mb-3 flex items-center gap-2">
                                <span className="rounded-lg bg-[#E8F2FF] px-2.5 py-1 text-[11px] font-bold text-[#0872E5]">
                                    PASAL {sectionIndex + 1}
                                </span>
                            </div>

                            {/* ARTICLE TITLE */}
                            <h2
                                id={`${section.id}-title`}
                                className="text-[15px] font-bold leading-relaxed text-[#00357A] sm:text-base"
                            >
                                {section.title.replace(
                                    /^PASAL \d+:\s*/,
                                    ""
                                )}
                            </h2>

                            {/* ARTICLE INTRODUCTION */}
                            {section.paragraphs?.map((paragraph, index) => (
                                <p
                                    key={index}
                                    className="mt-4 text-[13px] leading-[1.85] text-slate-700 sm:text-sm"
                                >
                                    {paragraph}
                                </p>
                            ))}

                            {/* NUMBERED POINTS */}
                            {section.points && (
                                <ol className="mt-4 list-decimal space-y-3 pl-5 marker:font-semibold marker:text-[#0872E5]">
                                    {section.points.map((point, index) => (
                                        <li
                                            key={index}
                                            className="pl-1 text-[13px] leading-[1.85] text-slate-700 sm:text-sm"
                                        >
                                            {point}
                                        </li>
                                    ))}
                                </ol>
                            )}

                            {section.id === "pasal-9" && (
                                <div className="mt-5 space-y-4 rounded-xl bg-[#F5F9FF] p-4">
                                    {/* COMPANY */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#0872E5]">
                                            <ShieldCheck size={19} />
                                        </div>

                                        <div>
                                            <p className="text-[11px] text-[#526787]">
                                                Perusahaan
                                            </p>

                                            <p className="mt-1 text-[13px] font-bold text-[#00357A]">
                                                PT DIGITAL NUSANTARA SINERGI
                                            </p>
                                        </div>
                                    </div>

                                    {/* ADDRESS */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#0872E5]">
                                            <MapPin size={19} />
                                        </div>

                                        <div>
                                            <p className="text-[11px] text-[#526787]">
                                                Alamat
                                            </p>

                                            <p className="mt-1 text-[13px] leading-relaxed text-[#00357A]">
                                                Gedung Gondangdia Lama,
                                                Jl. RP Soeroso No. 25,
                                                Jakarta Pusat,
                                                DKI Jakarta 10330
                                            </p>
                                        </div>
                                    </div>

                                    {/* EMAIL */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#0872E5]">
                                            <Mail size={19} />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-[11px] text-[#526787]">
                                                Email Bantuan
                                            </p>

                                            <a
                                                href="mailto:info@dnstech.co.id"
                                                className="mt-1 block break-all text-[13px] font-semibold text-[#0872E5] underline underline-offset-2"
                                            >
                                                info@dnstech.co.id
                                            </a>
                                        </div>
                                    </div>

                                    {/* CUSTOMER SERVICE */}
                                    <div className="border-t border-[#DFE8F5] pt-3">
                                        <p className="text-[11px] text-[#526787]">
                                            Layanan Pelanggan
                                        </p>

                                        <p className="mt-1 text-[13px] leading-relaxed text-[#00357A]">
                                            Fitur Bantuan / Customer Service
                                            pada Aplikasi STIQR Health
                                        </p>
                                    </div>
                                </div>
                            )}
                        </section>
                    ))}
                </div>

                <section className="mt-6 rounded-2xl border border-[#D8E4F2] bg-white p-5 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0872E5]">
                        <ShieldCheck size={21} />
                    </div>

                    <p className="mt-3 text-sm font-bold text-[#00357A]">
                        STIQR Health
                    </p>

                    <p className="mt-1 text-xs italic text-[#526787]">
                        Sehat Lebih Dekat, Hidup Lebih Baik
                    </p>

                    <p className="mt-4 text-[11px] text-slate-500">
                        Kebijakan Privasi berlaku sejak 27 Oktober 2026.
                    </p>

                    <button
                        type="button"
                        onClick={scrollToTop}
                        className="mt-5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#BDD0E7] bg-white px-4 py-2.5 text-xs font-semibold text-[#0872E5] transition hover:bg-blue-50"
                    >
                        <ArrowUp size={15} />
                        Kembali ke atas
                    </button>
                </section>
            </main>
        </div>
    );
};

export default PrivacyPolicy;
