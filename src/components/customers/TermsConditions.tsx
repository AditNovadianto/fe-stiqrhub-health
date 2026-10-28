import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    ArrowUp,
    CalendarDays,
    ChevronDown,
    FileText,
    Mail,
    MapPin,
    ShieldCheck,
} from "lucide-react";

interface TermsSection {
    id: string;
    number: number;
    title: string;
    description: string;
    points?: string[];
    conclusion?: string;
}

const termsSections: TermsSection[] = [
    {
        id: "pasal-1",
        number: 1,
        title: "TENTANG STIQR HEALTH",
        description:
            "Pasal ini mengatur identitas pengelola platform, ruang lingkup layanan STIQR Health, serta pemisahan peran utama antara penyedia platform digital dan penyedia layanan kesehatan.",
        points: [
            "PT. Digital Nusantara Sinergi (“Kami”) adalah pemilik dan pengelola platform STIQR Health yang diakses melalui mini program pada aplikasi DANA dan/atau situs web resmi STIQR Health.",
            "Melalui Platform STIQR Health, Pengguna dapat melakukan pembelian paket layanan kesehatan dan kecantikan yang disediakan oleh klinik atau fasilitas pelayanan kesehatan mitra (“Penyedia Layanan”) dalam bentuk hak akses elektronik (Health Pass).",
            "Peran Kami terbatas pada penyediaan platform digital, pemrosesan transaksi pembayaran, penerbitan Health Pass, serta penanganan bantuan operasional dan keluhan transaksi.",
            "Seluruh pelayanan kesehatan, tindakan medis, dan fasilitas pendukung diberikan secara langsung oleh Penyedia Layanan serta tenaga kesehatan profesional yang berwenang.",
        ],
    },
    {
        id: "pasal-2",
        number: 2,
        title: "DEFINISI DAN ISTILAH",
        description:
            "Pasal ini memberikan batasan dan definisi atas istilah-istilah utama yang digunakan dalam Syarat dan Ketentuan ini guna menghindari penafsiran ganda.",
        points: [
            "Health Pass adalah Bukti hak layanan elektronik berwujud kode dan QR unik yang diterbitkan secara sah oleh sistem setelah pembayaran berhasil dikonfirmasi.",
            "Pembeli adalah pemilik akun terdaftar pada STIQR Health yang melakukan transaksi dan pembayaran Health Pass.",
            "Pasien adalah perseorangan yang namanya tercantum pada Health Pass sebagai penerima manfaat layanan kesehatan, baik berupa Pembeli itu sendiri maupun Pihak ketiga yang ditunjuk.",
            "Paket adalah rincian layanan kesehatan/kecantikan yang mencakup cakupan tindakan, harga final, lokasi cabang klinik, dan masa berlaku sebagaimana ditampilkan pada rincian layanan.",
        ],
    },
    {
        id: "pasal-3",
        number: 3,
        title: "KETENTUAN AKUN DAN AKSES",
        description:
            "Pasal ini menetapkan tata cara pendaftaran, mekanisme autentikasi masuk, serta tanggung jawab Pengguna dalam menjaga keamanan akun.",
        points: [
            "Pengoperasian akun STIQR Health menggunakan alamat email unik sebagai identitas utama. Satu alamat email hanya dapat terhubung dengan satu akun terdaftar.",
            "Autentikasi Masuk (login) dilakukan menggunakan kode sekali pakai (One-Time Password / OTP) yang dikirimkan ke alamat email terdaftar atau kanal komunikasi resmi lainnya yang tersedia pada Platform.",
            "Sesi masuk (login session) berlaku selama 24 (dua puluh empat) jam sejak aktivitas terakhir pada perangkat yang sama. Sesi akan berakhir secara otomatis dan memerlukan verifikasi OTP ulang apabila melewati jangka waktu tersebut atau saat diakses dari perangkat baru.",
            "Kode OTP bersifat rahasia. Pengguna dilarang memberikan kode OTP kepada pihak manapun. Kami tidak pernah meminta kode OTP Pengguna dalam bentuk atau melalui media apapun.",
            "Pengguna bertanggung jawab penuh atas keamanan akses email dan perangkat pribadi. Pengguna wajib segera menghubungi Kami apabila menduga adanya penggunaan akun tanpa izin oleh pihak lain.",
        ],
    },
    {
        id: "pasal-4",
        number: 4,
        title: "PERSYARATAN USIA DAN KECAKAPAN HUKUM",
        description:
            "Pasal ini mengatur batasan kualifikasi usia dan syarat pendampingan hukum bagi Pengguna maupun Pasien di bawah umur.",
        points: [
            "Untuk membuat akun dan melakukan transaksi pembelian Health Pass, Pengguna wajib berusia sekurang-kurangnya 18 (delapan belas) tahun atau sudah menikah secara sah menurut hukum yang berlaku.",
            "Pembelian Health Pass untuk Pasien berusia dibawah 18 (delapan belas) tahun wajib dilakukan oleh orang tua atau wali sah. Pasien dibawah umur wajib didampingi oleh orang tua atau wali sah selama pelaksanaan kunjungan di lokasi Penyedia Layanan.",
        ],
    },
    {
        id: "pasal-5",
        number: 5,
        title: "PEMBELIAN DAN PEMBAYARAN",
        description:
            "Pasal ini mengatur tata cara pemesanan, penentuan harga final, saluran pembayaran resmi, serta hak koreksi transaksi oleh platform.",
        points: [
            "Sebelum menyelesaikan pembelian, Pengguna wajib memeriksa seluruh rincian Paket, termasuk jenis tindakan, lokasi cabang, dan masa berlaku.",
            "Harga yang tercantum pada halaman konfirmasi pembayaran merupakan harga final yang telah memperhitungkan potongan harga, voucher, atau pajak yang berlaku.",
            "Transaksi pada mini program DANA diproses melalui sistem DANA. Transaksi pada situs web diproses melalui mitra penyedia gerbang pembayaran (payment gateway) resmi.",
            "Health Pass diterbitkan dan dikirimkan ke akun serta alamat email Pembeli secara otomatis setelah pembayaran terverifikasi secara sah oleh sistem.",
            "Kami berhak membatalkan transaksi apabila terjadi kekeliruan harga yang nyata (obvious pricing error), kegagalan sistem yang menyebabkan kuota habis terlampaui, atau indikasi transaksi tidak wajar/penyalahgunaan.",
        ],
    },
    {
        id: "pasal-6",
        number: 6,
        title: "KETENTUAN HEALTH PASS",
        description:
            "Pasal ini menetapkan ketentuan masa berlaku, prinsip penggunaan individual, serta sifat kerahasiaan bukti layanan elektronik.",
        points: [
            "Health Pass berlaku selama 60 (enam puluh) hari kalender terhitung sejak tanggal pembayaran berhasil dikonfirmasi. Tanggal kadaluarsa tercantum pada Health Pass, dan pemberitahuan pengingat dikirimkan 14 (empat belas) hari serta 3 (tiga) hari sebelum tanggal berakhir.",
            "Satu Health Pass berlaku khusus untuk 1 (satu) orang Pasien, 1 (satu) kali penukaran layanan, dan hanya pada lokasi cabang Penyedia Layanan yang dipilih saat transaksi.",
            "Pembelian untuk orang lain dilakukan dengan mencantumkan data diri Pasien (Nama Lengkap dan Tanggal Lahir) sesuai dokumen identitas resmi (KTP). Health Pass akan terbit pada akun dan email Pemilik Akun yang telah melakukan registrasi.",
            "Pengguna wajib menjaga kerahasiaan kode dan QR Health Pass. Health Pass yang telah divalidasi (redeemed) oleh Penyedia Layanan tidak dapat digunakan kembali.",
            "Health Pass bersifat non-tunai dan tidak dapat ditukarkan dengan uang tunai secara langsung di lokasi Penyedia Layanan.",
        ],
    },
    {
        id: "pasal-7",
        number: 7,
        title: "KUNJUNGAN DAN PELAKSANAAN LAYANAN",
        description:
            "Pasal ini menguraikan prosedur kedatangan Pasien, standar waktu pelayanan minimum, serta mekanisme penanganan kondisi medis di lokasi.",
        points: [
            "Pasien hadir dicabang Penyedia Layanan secara walk-in pada jam operasional. Estimasi tanggal dan jam kunjungan yang dipilih saat transaksi berfungsi sebagai jadwal kedatangan dan pemberitahuan awal bagi klinik.",
            "Pasien wajib menunjukan kode/QR Health Pass beserta dokumen identitas resmi (KTP/SIM/Paspor) yang sesuai dengan nama Pasien pada Health Pass saat pendaftaran ulang di lokasi.",
            "Kedatangan dan penanganan medis di lokasi mengikuti urutan antrian umum pada fasilitas kesehatan. Jam yang tertera merupakan estimasi jam pendaftaran/registrasi, bukan kepastian jam dimulainya tindakan medis.",
            "Apabila estimasi waktu tunggu di lokasi melebihi batas waktu tunggu 45 menit terlampaui, Pasien berhak memilih untuk tetap menunggu, atau menjadwalkan ulang kunjungan.",
            "Harga Paket pada Health Pass telah bersifat all-in mencakup biaya pendaftaran, administrasi, konsultasi dokter, pemeriksaan penunjang/syarat tindakan, Alat Pelindung Diri (APD), sterilisasi, Bahan Medis Habis Pakai (BMHP), serta obat generik terkait tindakan paket (apabila ada). Penyedia Layanan dilarang mengenakan biaya tambahan atau meminta uang muka (deposit) atas komponen tersebut.",
            "Setiap tindakan atau obat diluar rincian Paket yang tercantum pada Health Pass hanya dapat dilakukan atas persetujuan eksplisit Pasien dan dibayarkan secara terpisah langsung kepada Penyedia Layanan.",
        ],
    },
    {
        id: "pasal-8",
        number: 8,
        title: "PEMBATALAN DAN PENJADWALAN ULANG (RESCHEDULE)",
        description:
            "Pasal ini menetapkan ketentuan pembatalan, penjadwalan ulang (reschedule), serta penegasan bahwa seluruh transaksi pada STIQR Health bersifat non-refundable (tidak ada pengembalian uang tunai).",
    },
    {
        id: "pasal-9",
        number: 9,
        title: "PEMBAGIAN TANGGUNG JAWAB",
        description:
            "Pasal ini memberikan kepastian mengenai batasan kewajiban Kami selaku Penyedia Sistem Digital dan Penyedia Layanan selaku pelaksana tindakan Kesehatan",
        points: [
            "Tanggung Jawab Kami : Kami bertanggung jawab atas kebenaran informasi Paket yang ditampilkan pada platform, kelancaran pemrosesan pembayaran, penerbitan Health Pass.",
            "Tanggung Jawab Penyedia Layanan : Penyedia Layanan bertanggung jawab penuh atas pelaksanaan pelayanan kesehatan, penilaian klinis, keputusan medis, tindakan kesehatan, mutu pelayanan, serta kerahasiaan dan penyimpanan rekam medis sesuai ketentuan perundang-undangan di bidang kesehatan.",
            "Fasilitas Keluhan : Kami membantu Pengguna dalam menyampaikan dan memantau penanganan keluhan atas layanan Penyedia Layanan sesuai pasal 12",
            "Penafsiran Layanan Darurat : STIQR Health bukan merupakan layanan tanggap darurat medis. Dalam kondisi darurat medis, Pengguna/Pasien dianjurkan untuk segera menghubungi 119 atau menuju Unit Gawat Darurat (UGD) rumah sakit terdekat.",
        ],
    },
    {
        id: "pasal-10",
        number: 10,
        title: "PERLINDUNGAN DATA PRIBADI",
        description:
            "Pasal ini menjamin tata kelola pemrosesan data pribadi Pengguna dan Pasien agar sesuai dengan asas perlindungan data dan regulasi yang berlaku.",
        points: [
            "Pemrosesan data pribadi Pengguna dan Pasien dilaksanakan sesuai dengan Kebijakan Privasi STIQR Health dan tunduk pada Undang-Undang Nomor 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP)",
            "Saat menyelesaikan transaksi, Pengguna menyetujui pembagian data Pasien (Nama Lengkap dan Tanggal Lahir) kepada Penyedia Layanan yang dituju sebatas untuk kebutuhan identifikasi dan verifikasi pendaftaran. Alamat email Pembeli tidak dibagikan kepada Penyedia Layanan.",
            "Pembeli yang mendaftarkan data pihak lain sebagai Pasien menjamin bahwa telah memperoleh persetujuan (consent) yang sah dari pihak tersebut untuk pembagian data pribadinya.",
        ],
    },
    {
        id: "pasal-11",
        number: 11,
        title: "HAL-HAL YANG DILARANG",
        description:
            "Pasal ini menetapkan batasan perilaku Pengguna serta sanksi administratif berupa penangguhan akun atas pelanggaran sistem maupun prosedur",
        points: [
            "Menjual kembali (resell) atau mengkomersilkan Health Pass untuk mencari keuntungan pribadi tanpa tertulis dari kami.",
            "Menggunakan identitas atau data pribadi orang lain secara tanpa hak.",
            "Membuat beberapa akun (multiple accounts) untuk menyalahgunakan promo, voucher, atau batas penggunaan sistem.",
            "Mengganggu, meretas, melakukan rekayasa balik (reverse engineering), atau menyalahgunakan sistem STIQR Health.",
        ],
        conclusion:
            "Kami berhak menangguhkan atau melepaskan akses akun yang terbukti melanggar ketentuan di atas. Health Pass yang dibeli secara benar sebelum penangguhan akun akan tetap dihormati sepanjang tidak teridentifikasi fraud.",
    },
    {
        id: "pasal-12",
        number: 12,
        title: "BANTUAN DAN PENANGANAN KELUHAN",
        description:
            "Pasal ini menyediakan saluran resmi bagi Pengguna untuk menyampaikan pertanyaan, kendala operasional, maupun keluhan medis.",
        points: [
            "Pengguna dapat menyampaikan pertanyaan atau keluhan melalui menu Bantuan pada aplikasi STIQR Health untuk memulai email resmi ke info@dnstech.co.id",
            "Tim Bantuan memberikan respon resmi paling lambat 1 x 24 Jam pada hari kerja.",
            "Keluhan terkait tindakan medis atau pelayanan kesehatan akan diteruskan secara resmi kepada Penyedia Layanan terkait dan dipantau oleh Kami hingga memperoleh kepastian penanganan",
        ],
    },
    {
        id: "pasal-13",
        number: 13,
        title: "PERUBAHAN SYARAT DAN KETENTUAN",
        description:
            "Pasal ini mengatur mekanisme pembaruan Syarat dan Ketentuan serta perlindungan hak bagi Pengguna yang telah melakukan transaksi sebelumnya.",
        points: [
            "Kami berhak untuk melakukan pembaruan atau penyesuaian atas Syarat dan Ketentuan ini dari waktu ke waktu.",
            "Perubahan material akan diberitahukan melalui pemberitahuan pada aplikasi STIQR Health atau melalui email sekurang-kurangnya 7 (tujuh) hari kalender sebelum tanggal penyesuaian diberlakukan.",
            "Health Pass yang telah dibeli sebelum tanggal efektif perubahan akan tetap tunduk pada Syarat dan Ketentuan yang berlaku pada saat transaksi dilakukan.",
        ],
    },
    {
        id: "pasal-14",
        number: 14,
        title: "HUKUM YANG BERLAKU DAN PENYELESAIAN SENGKETA",
        description:
            "Pasal ini menentukan yurisdiksi hukum yang menguasai perjanjian serta tahapan penyelesaian perselisihan.",
        points: [
            "Syarat dan Ketentuan ini diatur dan ditafsirkan berdasarkan hukum yang berlaku di Negara Republik Indonesia.",
            "Setiap perselisihan yang timbul sehubungan dengan penggunaan layanan STIQR Health akan diselesaikan terlebih dahulu secara musyawarah untuk mufakat.",
            "Apabila perselisihan tidak dapat diselesaikan secara musyawarah, Pengguna dapat menempuh jalur penyelesaian sengketa melalui Badan Penyelesaian Sengketa Konsumen (BPSK) atau Pengadilan Negeri sesuai ketentuan peraturan perundang-undangan.",
        ],
    },
];

const rescheduleRows = [
    {
        condition:
            "Klinik berhalangan melayani (tutup, kuota harian penuh, atau dokter tidak di tempat)",
        right:
            "Pengguna berhak melakukan penjadwalan ulang (reschedule) kedatangan ke hari lain selama Health Pass masih berlaku.",
    },
    {
        condition:
            "Waktu tunggu melebihi batas 45 menit (sesuai pasal 7.3)",
        right:
            "Pengguna berhak memilih untuk tetap menunggu antrian atau melakukan penjadwalan ulang (reschedule) kedatangan di hari lain selama masa berlaku Health Pass.",
    },
    {
        condition:
            "Health Pass berakhir tanpa digunakan (Kadaluarsa)",
        right:
            "Health Pass dianggap hangus secara otomatis, tidak dapat diperpanjang, tidak dapat digunakan kembali dan tidak ada pengembalian dana (non-refundable)",
    },
    {
        condition: "Layanan telah selesai diberikan",
        right:
            "Transaksi dinyatakan selesai secara penuh dan tidak dapat dibatalkan atau dikembalikan (non-refundable)",
    },
];

const TermsConditions = () => {
    const navigate = useNavigate();

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
                        <FileText size={25} strokeWidth={1.8} />
                    </div>

                    <h2 className="mt-5 text-[23px] font-bold leading-tight tracking-tight text-[#00357A] sm:text-[27px]">
                        Syarat dan Ketentuan STIQR Health
                    </h2>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#526787]">
                        <CalendarDays
                            size={15}
                            className="shrink-0 text-[#0872E5]"
                        />

                        <span>
                            Tanggal Efektif:
                            <strong className="ml-1 text-[#00357A]">
                                27 Oktober 2026
                            </strong>
                        </span>
                    </div>

                    <p className="mt-6 text-[13px] leading-[1.85] text-slate-700 sm:text-sm">
                        Syarat dan Ketentuan ini merupakan perjanjian
                        mengikat antara PT. Digital Nusantara Sinergi
                        selaku penyedia platform STIQR Health dan
                        Pengguna (“Anda”/”Pengguna”). Dengan mengakses
                        akun, melakukan pendaftaran, atau membeli
                        Health Pass, Pengguna menyatakan telah membaca,
                        memahami, dan menyetujui seluruh isi Syarat
                        dan Ketentuan ini serta Kebijakan Privasi
                        STIQR Health.
                    </p>

                    <button
                        type="button"
                        onClick={() => navigate("/customer/privacy-policy")}
                        className="mt-5 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#0872E5] underline underline-offset-4 transition hover:text-blue-700"
                    >
                        <ShieldCheck size={16} />
                        Baca Kebijakan Privasi
                    </button>
                </section>

                <section className="mt-4 overflow-hidden rounded-2xl border border-[#D8E4F2] bg-white">
                    <button
                        type="button"
                        onClick={() =>
                            setShowTableOfContents((prev) => !prev)
                        }
                        aria-expanded={showTableOfContents}
                        aria-controls="terms-table-of-contents"
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
                            id="terms-table-of-contents"
                            aria-label="Daftar isi Syarat dan Ketentuan"
                            className="border-t border-[#E6EDF6] px-5 py-2"
                        >
                            {termsSections.map((section) => (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => scrollToSection(section.id)}
                                    className="flex w-full cursor-pointer items-start gap-3 border-b border-slate-100 py-3 text-left last:border-b-0 hover:text-blue-600"
                                >
                                    <span className="w-7 shrink-0 text-xs font-bold text-[#0872E5]">
                                        {String(section.number).padStart(2, "0")}
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
                    {termsSections.map((section) => (
                        <section
                            key={section.id}
                            id={section.id}
                            aria-labelledby={`${section.id}-title`}
                            className="scroll-mt-20 rounded-2xl border border-[#D8E4F2] bg-white p-5 sm:p-7"
                        >
                            {/* ARTICLE NUMBER */}
                            <div className="mb-3 flex items-center gap-2">
                                <span className="rounded-lg bg-[#E8F2FF] px-2.5 py-1 text-[11px] font-bold text-[#0872E5]">
                                    PASAL {section.number}
                                </span>
                            </div>

                            {/* ARTICLE TITLE */}
                            <h2
                                id={`${section.id}-title`}
                                className="text-[15px] font-bold leading-relaxed text-[#00357A] sm:text-base"
                            >
                                {section.title}
                            </h2>

                            {/* DESCRIPTION */}
                            <p className="mt-4 text-[13px] leading-[1.85] text-slate-700 sm:text-sm">
                                {section.description}
                            </p>

                            {/* ARTICLE 11 INTRODUCTION */}
                            {section.number === 11 && (
                                <p className="mt-4 text-[13px] font-medium leading-[1.85] text-slate-700 sm:text-sm">
                                    Pengguna dilarang keras untuk :
                                </p>
                            )}

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

                            {section.number === 8 && (
                                <div className="mt-4 space-y-5">
                                    {/* POINT 1 */}
                                    <div className="flex items-start gap-3">
                                        <span className="shrink-0 text-[13px] font-bold text-[#0872E5]">
                                            1.
                                        </span>

                                        <p className="text-[13px] leading-[1.85] text-slate-700 sm:text-sm">
                                            Prinsip Non-Refundable : Seluruh
                                            pembayaran Health Pass yang telah
                                            berhasil dikonfirmasi bersifat final
                                            dan tidak dapat dibatalkan untuk
                                            dikembalikan dalam bentuk uang tunai
                                            (non-refundable), baik sebagian maupun
                                            seluruhnya.
                                        </p>
                                    </div>

                                    {/* POINT 2 */}
                                    <div>
                                        <div className="flex items-start gap-3">
                                            <span className="shrink-0 text-[13px] font-bold text-[#0872E5]">
                                                2.
                                            </span>

                                            <p className="text-[13px] font-semibold leading-[1.85] text-slate-700 sm:text-sm">
                                                Matriks Hak Pengguna dan Penjadwalan
                                                Ulang (Reschedule)
                                            </p>
                                        </div>

                                        <div className="mt-4 overflow-x-auto rounded-xl border border-[#D8E4F2]">
                                            <table className="w-full min-w-135 border-collapse text-left">
                                                <thead className="bg-[#EAF3FF]">
                                                    <tr>
                                                        <th
                                                            scope="col"
                                                            className="w-[43%] border-b border-r border-[#D8E4F2] px-4 py-3 text-xs font-bold text-[#00357A]"
                                                        >
                                                            Kondisi Transaksi / Layanan
                                                        </th>

                                                        <th
                                                            scope="col"
                                                            className="border-b border-[#D8E4F2] px-4 py-3 text-xs font-bold text-[#00357A]"
                                                        >
                                                            Hak Pengguna
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {rescheduleRows.map((row, index) => (
                                                        <tr
                                                            key={index}
                                                            className={
                                                                index % 2 === 0
                                                                    ? "bg-white"
                                                                    : "bg-[#F8FBFF]"
                                                            }
                                                        >
                                                            <td className="border-b border-r border-[#E4ECF5] px-4 py-4 align-top text-xs leading-relaxed text-slate-700">
                                                                {row.condition}
                                                            </td>

                                                            <td className="border-b border-[#E4ECF5] px-4 py-4 align-top text-xs leading-relaxed text-slate-700">
                                                                {row.right}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <p className="mt-2 text-[11px] text-slate-500">
                                            Geser tabel ke samping untuk melihat
                                            informasi selengkapnya.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ARTICLE CONCLUSION */}
                            {section.conclusion && (
                                <p className="mt-5 text-[13px] leading-[1.85] text-slate-700 sm:text-sm">
                                    {section.conclusion}
                                </p>
                            )}

                            {/* PRIVACY REFERENCE IN ARTICLE 10 */}
                            {section.number === 10 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate("/customer/privacy-policy")
                                    }
                                    className="mt-5 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#0872E5] underline underline-offset-4 hover:text-blue-700"
                                >
                                    <ShieldCheck size={16} />
                                    Lihat Kebijakan Privasi STIQR Health
                                </button>
                            )}
                        </section>
                    ))}
                </div>

                <section className="mt-4 rounded-2xl border border-[#D8E4F2] bg-white p-5 sm:p-7">
                    <h2 className="text-base font-bold text-[#00357A]">
                        Kontak Resmi
                    </h2>

                    <div className="mt-5 space-y-4">
                        {/* COMPANY */}
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0872E5]">
                                <ShieldCheck size={19} />
                            </div>

                            <div>
                                <p className="text-[11px] text-[#526787]">
                                    Perusahaan
                                </p>

                                <p className="mt-1 text-[13px] font-bold text-[#00357A]">
                                    PT Digital Nusantara Sinergi
                                </p>
                            </div>
                        </div>

                        {/* ADDRESS */}
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0872E5]">
                                <MapPin size={19} />
                            </div>

                            <div>
                                <p className="text-[11px] text-[#526787]">
                                    Alamat
                                </p>

                                <p className="mt-1 text-[13px] leading-relaxed text-[#00357A]">
                                    Gedung Gondangdia Lama,
                                    Jl. RP Soeroso No. 25,
                                    Jakarta Pusat
                                </p>
                            </div>
                        </div>

                        {/* EMAIL */}
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0872E5]">
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
                    </div>
                </section>

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
                        Syarat dan Ketentuan berlaku sejak
                        27 Oktober 2026.
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

export default TermsConditions;
