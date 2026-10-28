import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    ArrowUp,
    ChevronDown,
    FileLock2,
    Mail,
    ShieldCheck,
} from "lucide-react";

interface ConsentSection {
    id: string;
    number: number;
    title: string;
    description: string;
    points?: string[];
}

const consentSections: ConsentSection[] = [
    {
        id: "data-pribadi",
        number: 1,
        title: "Data Pribadi yang Diproses",
        description:
            "Pengguna memahami bahwa keperluan verifikasi identitas dan penyelenggaraan layanan STIQR Health, data pribadi yang relevan dapat mencakup nama lengkap, nomor identitas, foto atau salinan Kartu Tanda Penduduk (KTP), serta informasi lainnya yang diperlukan.",
    },
    {
        id: "tujuan-pemrosesan",
        number: 2,
        title: "Tujuan Pemrosesan Data",
        description:
            "Pengguna memahami bahwa data pribadi diproses untuk",
        points: [
            "Melakukan Verifikasi dan validasi identitas Pengguna",
            "Mendukung proses administrasi dan penyelenggaraan layanan STIQR Health.",
            "Memenuhi kewajiban hukum yang berlaku, sepanjang relevan.",
        ],
    },
    {
        id: "perlindungan-data",
        number: 3,
        title: "Pemrosesan dan Perlindungan Data",
        description:
            "Pengguna memahami bahwa data pribadi akan diproses sesuai dengan tujuan yang telah diinformasikan. STIQR berkomitmen untuk menjaga kerahasiaan dan melakukan upaya perlindungan data pribadi sesuai dengan peran dan tanggung jawabnya serta ketentuan peraturan perundang-undangan yang berlaku.",
    },
    {
        id: "hak-pengguna",
        number: 4,
        title: "Hak Pengguna",
        description:
            "Pengguna dapat mengajukan permintaan terkait hak atas data pribadinya sesuai dengan ketentuan peraturan perundang-undangan yang berlaku melalui kanal layanan STIQR yang diinformasikan kepada Pengguna",
    },
    {
        id: "pernyataan-persetujuan",
        number: 5,
        title: "Pernyataan Persetujuan",
        description:
            "Dengan memberikan persetujuan melalui pilihan yang tersedia, Pengguna menyatakan bahwa Pengguna telah membaca dan memahami informasi mengenai pemrosesan Data Pribadi untuk keperluan verifikasi identitas dan penyelenggaraan layanan STIQR Health.",
    },
];

const UserConsent = () => {
    const navigate = useNavigate();

    const [
        showTableOfContents,
        setShowTableOfContents,
    ] = useState(false);

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
                        Persetujuan Pemrosesan Data Pribadi
                    </h2>

                    <p className="mt-2 text-sm font-bold text-[#0872E5]">
                        STIQR HEALTH
                    </p>

                    <p className="mt-6 text-[13px] leading-[1.85] text-slate-700 sm:text-sm">
                        Dengan menggunakan Fitur STIQR Health yang
                        memerlukan verifikasi identitas, Pengguna
                        diminta untuk membaca Informasi berikut
                        sebelum memberikan persetujuan.
                    </p>
                </section>

                <section className="mt-4 overflow-hidden rounded-2xl border border-[#D8E4F2] bg-white">
                    <button
                        type="button"
                        onClick={() =>
                            setShowTableOfContents((prev) => !prev)
                        }
                        aria-expanded={showTableOfContents}
                        aria-controls="consent-table-of-contents"
                        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
                    >
                        <div>
                            <h2 className="text-sm font-bold text-[#00357A]">
                                Daftar Isi
                            </h2>

                            <p className="mt-1 text-xs text-[#526787]">
                                Pilih bagian untuk membaca informasinya
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
                            id="consent-table-of-contents"
                            aria-label="Daftar isi persetujuan data pribadi"
                            className="border-t border-[#E6EDF6] px-5 py-2"
                        >
                            {consentSections.map((section) => (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => scrollToSection(section.id)}
                                    className="flex w-full cursor-pointer items-start gap-3 border-b border-slate-100 py-3 text-left last:border-b-0 hover:text-blue-600"
                                >
                                    <span className="w-6 shrink-0 text-xs font-bold text-[#0872E5]">
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
                    {consentSections.map((section) => (
                        <section
                            key={section.id}
                            id={section.id}
                            aria-labelledby={`${section.id}-title`}
                            className="scroll-mt-20 rounded-2xl border border-[#D8E4F2] bg-white p-5 sm:p-7"
                        >
                            <div className="mb-3">
                                <span className="inline-flex rounded-lg bg-[#E8F2FF] px-2.5 py-1 text-[11px] font-bold text-[#0872E5]">
                                    BAGIAN {section.number}
                                </span>
                            </div>

                            <h3
                                id={`${section.id}-title`}
                                className="text-[15px] font-bold leading-relaxed text-[#00357A] sm:text-base"
                            >
                                {section.title}
                            </h3>

                            <p className="mt-4 text-[13px] leading-[1.85] text-slate-700 sm:text-sm">
                                {section.description}
                            </p>

                            {section.points && (
                                <ul className="mt-4 list-disc space-y-3 pl-5 marker:text-[#0872E5]">
                                    {section.points.map((point, index) => (
                                        <li
                                            key={index}
                                            className="pl-1 text-[13px] leading-[1.85] text-slate-700 sm:text-sm"
                                        >
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    ))}
                </div>

                <section className="mt-4 rounded-2xl border border-[#D8E4F2] bg-white p-5 sm:p-7">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0872E5]">
                            <ShieldCheck size={21} />
                        </div>

                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-[#00357A]">
                                Persetujuan yang Diberikan
                            </h2>

                            <p className="mt-3 text-[13px] leading-[1.85] text-slate-700 sm:text-sm">
                                Persetujuan ini diberikan secara sadar
                                untuk tujuan pemrosesan yang telah
                                diinformasikan kepada Pengguna
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-[#DCEAFF] bg-[#F5F9FF] p-4">
                        <p className="text-[13px] leading-[1.85] text-[#00357A] sm:text-sm">
                            Saya telah membaca dan memahami informasi
                            pemrosesan Data Pribadi serta menyetujui
                            pemrosesan Data Pribadi saya untuk keperluan
                            Verifikasi Identitas dan penyelenggaraan
                            layanan STIQR Health sesuai dengan Ketentuan
                            yang berlaku.
                        </p>
                    </div>

                    <p className="mt-4 text-xs leading-relaxed text-slate-500">
                        Persetujuan diberikan melalui pilihan yang
                        tersedia pada formulir layanan STIQR Health.
                        Membaca halaman ini tidak secara otomatis
                        memberikan persetujuan.
                    </p>
                </section>

                <section className="mt-4 rounded-2xl border border-[#D8E4F2] bg-white p-5">
                    <h2 className="text-sm font-bold text-[#00357A]">
                        Informasi Terkait
                    </h2>

                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        Untuk memahami ketentuan perlindungan data
                        pribadi secara lebih lengkap, silakan
                        membaca Kebijakan Privasi STIQR Health.
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            navigate("/customer/privacy-policy")
                        }
                        className="mt-4 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#0872E5] underline underline-offset-4 hover:text-blue-700"
                    >
                        <ShieldCheck size={16} />
                        Baca Kebijakan Privasi
                    </button>

                    <div className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-4">
                        <Mail
                            size={15}
                            className="mt-0.5 shrink-0 text-[#0872E5]"
                        />

                        <p className="text-xs leading-relaxed text-slate-600">
                            Pertanyaan terkait pemrosesan data pribadi
                            dapat disampaikan melalui{" "}
                            <a
                                href="mailto:info@dnstech.co.id"
                                className="font-semibold text-[#0872E5] underline underline-offset-2"
                            >
                                info@dnstech.co.id
                            </a>
                            .
                        </p>
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

export default UserConsent;
