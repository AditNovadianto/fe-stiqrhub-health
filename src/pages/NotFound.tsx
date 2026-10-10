
import { useNavigate, useLocation } from "react-router-dom";

import {
    ArrowLeft,
    House,
    SearchX,
    Stethoscope,
    HeartPulse,
} from "lucide-react";

const NotFound = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isProvider =
        location.pathname === "/provider" ||
        location.pathname.startsWith("/provider/");

    const homePath = isProvider
        ? "/provider/dashboard"
        : "/customer/home";

    const handleBack = () => {
        if (window.history.state?.idx > 0) {
            navigate(-1);
        } else {
            navigate(homePath, { replace: true });
        }
    };

    const handleHome = () => {
        navigate(homePath, { replace: true });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-cyan-50 via-sky-50 to-blue-100 px-5 py-10">
            <div className="w-full max-w-110">
                <div className="overflow-hidden rounded-3xl border border-white bg-white px-6 py-10 text-center shadow-xl shadow-blue-100/70 sm:px-10">
                    <div className="flex items-center justify-center gap-2">
                        <HeartPulse
                            size={23}
                            className="text-blue-600"
                        />

                        <span className="text-sm font-extrabold tracking-wide text-slate-800">
                            STIQR Health
                        </span>
                    </div>

                    <div className="relative mx-auto mt-10 flex h-48 w-full items-center justify-center">
                        {/* BACKGROUND DECORATIONS */}
                        <div className="absolute h-44 w-44 rounded-full bg-blue-50" />

                        <div className="absolute h-32 w-32 rounded-full bg-cyan-100/60" />

                        {/* DECORATIVE ICON */}
                        <div className="absolute right-5 top-2 flex h-11 w-11 rotate-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-600 shadow-sm">
                            <Stethoscope size={23} />
                        </div>

                        <div className="absolute bottom-3 left-5 flex h-10 w-10 -rotate-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-sm">
                            <HeartPulse size={21} />
                        </div>

                        {/* MAIN 404 */}
                        <div className="relative z-10">
                            <h1 className="text-[100px] font-black leading-none tracking-tighter text-blue-600 sm:text-[116px]">
                                404
                            </h1>

                            <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 shadow-md">
                                <SearchX
                                    size={16}
                                    className="text-blue-600"
                                />

                                <span className="whitespace-nowrap text-xs font-bold text-blue-600">
                                    Page Not Found
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10">
                        <h2 className="text-2xl font-extrabold text-slate-900">
                            Halaman Tidak Ditemukan
                        </h2>

                        <p className="mx-auto mt-3 max-w-77.5 text-sm leading-7 text-slate-500">
                            Maaf, halaman yang Anda cari tidak
                            tersedia, telah dipindahkan, atau alamat
                            yang dimasukkan tidak sesuai.
                        </p>
                    </div>

                    <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-medium text-slate-400">
                            Alamat yang diakses
                        </p>

                        <p className="mt-1 break-all text-xs font-semibold text-slate-600">
                            {location.pathname}
                        </p>
                    </div>

                    <div className="mt-8 space-y-3">
                        {/* HOME BUTTON */}
                        <button
                            type="button"
                            onClick={handleHome}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.98]"
                        >
                            <House size={19} />

                            {isProvider
                                ? "Ke Dashboard Provider"
                                : "Kembali ke Beranda"}
                        </button>

                        {/* BACK BUTTON */}
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]"
                        >
                            <ArrowLeft size={19} />
                            Halaman Sebelumnya
                        </button>
                    </div>

                    <div className="mt-9 border-t border-slate-100 pt-5">
                        <p className="text-xs text-slate-400">
                            STIQR Health
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                            Healthcare Services Platform
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
