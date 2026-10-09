
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    UserRound,
    Mail,
    Phone,
    IdCard,
    History,
    Ticket,
    LogOut,
    ChevronRight,
    ShieldCheck,
    RefreshCw,
    AlertCircle,
    X,
    CheckCircle2,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

interface Customer {
    id_customer?: number | string;
    name_customer?: string;
    email_customer?: string;
    phone_number_customer?: string;
    gender_customer?: string;
    date_of_birth?: string;
    address_customer?: string;
}

type CustomerRecord = Customer & {
    customer?: Customer;
    data?: Customer | { customer?: Customer };
};

const getCustomerData = (): Customer | null => {
    try {
        const stored = localStorage.getItem("customer_data");

        if (!stored) return null;

        const parsed = JSON.parse(stored) as CustomerRecord;

        if (!parsed || typeof parsed !== "object") {
            return null;
        }

        // Mendukung beberapa kemungkinan struktur login.
        let customer: Customer;

        if (parsed && typeof parsed === "object" && "customer" in parsed && parsed.customer) {
            customer = parsed.customer as Customer;
        } else if (parsed && typeof parsed === "object" && "data" in parsed && parsed.data) {
            customer = ("customer" in parsed.data && parsed.data.customer)
                ? (parsed.data.customer as Customer)
                : (parsed.data as Customer);
        } else {
            customer = parsed as Customer;
        }

        return customer;
    } catch (error) {
        console.error("[CUSTOMER DATA ERROR]", error);
        return null;
    }
};

const getInitials = (name: string): string => {
    const words = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) return "U";

    return words
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");
};

const formatCustomerId = (
    value?: number | string
): string => {
    if (value === undefined || value === null) {
        return "-";
    }

    return String(value);
};

const Profile = () => {
    const navigate = useNavigate();

    const [customer, setCustomer] =
        useState<Customer | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [showLogoutModal, setShowLogoutModal] =
        useState(false);

    const [refreshing, setRefreshing] =
        useState(false);

    const [errorMessage, setErrorMessage] =
        useState("");

    const redirectToLogin = () => {
        sessionStorage.removeItem("customer_token");
        localStorage.removeItem("customer_data");

        navigate(
            "/customer/sign-in?redirect=%2Fcustomer%2Fprofile",
            { replace: true }
        );
    };

    useEffect(() => {
        const token =
            sessionStorage.getItem("customer_token");

        if (!token || isTokenExpired(token)) {
            redirectToLogin();
            return;
        }

        const customerData = getCustomerData();

        setCustomer(customerData);

        if (!customerData) {
            setErrorMessage(
                "Data profil belum tersedia. Silakan login kembali."
            );
        }

        setLoading(false);
    }, [navigate]);

    const handleRefreshProfile = () => {
        setRefreshing(true);
        setErrorMessage("");

        const token =
            sessionStorage.getItem("customer_token");

        if (!token || isTokenExpired(token)) {
            redirectToLogin();
            return;
        }

        const updatedCustomer = getCustomerData();

        setCustomer(updatedCustomer);

        if (!updatedCustomer) {
            setErrorMessage(
                "Data profil tidak ditemukan di penyimpanan lokal."
            );
        }

        setRefreshing(false);
    };

    const handleLogout = () => {
        sessionStorage.removeItem("customer_token");
        localStorage.removeItem("customer_data");

        setCustomer(null);
        setShowLogoutModal(false);

        // Kembali ke halaman login
        navigate("/customer/sign-in", {
            replace: true,
        });
    };

    const customerName =
        customer?.name_customer?.trim() ||
        "Customer STIQR";

    const customerEmail =
        customer?.email_customer?.trim() ||
        "-";

    const customerPhone =
        customer?.phone_number_customer?.trim() ||
        "-";

    const customerId = formatCustomerId(
        customer?.id_customer
    );

    const initials = getInitials(customerName);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
                <div className="text-center">
                    <RefreshCw
                        size={30}
                        className="mx-auto animate-spin text-blue-600"
                    />

                    <p className="mt-4 text-sm text-slate-500">
                        Memuat profil...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[60vh] bg-slate-50 pb-10">
            <section className="bg-linear-to-br from-cyan-100 via-sky-100 to-blue-100 px-5 pb-8 pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            STIQR Health
                        </p>

                        <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                            Profil Saya
                        </h2>

                        <p className="mt-1 text-xs text-slate-600">
                            Informasi akun dan layanan Anda
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleRefreshProfile}
                        disabled={refreshing}
                        title="Refresh Profil"
                        aria-label="Refresh Profil"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm transition hover:bg-blue-50 disabled:opacity-50"
                    >
                        <RefreshCw
                            size={19}
                            className={
                                refreshing ? "animate-spin" : ""
                            }
                        />
                    </button>
                </div>

                {/* PROFILE CARD */}
                <div className="mt-6 rounded-3xl border border-white/70 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        {/* AVATAR */}
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-linear-to-br from-blue-600 to-cyan-400 text-2xl font-extrabold text-white shadow-md">
                            {initials}
                        </div>

                        {/* USER INFORMATION */}
                        <div className="min-w-0 flex-1">
                            <h3 className="wrap-break-word text-lg font-extrabold text-slate-900">
                                {customerName}
                            </h3>

                            <p className="mt-1 break-all text-xs text-slate-500">
                                {customerEmail}
                            </p>

                            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5">
                                <ShieldCheck
                                    size={14}
                                    className="text-emerald-600"
                                />

                                <span className="text-[11px] font-bold text-emerald-700">
                                    Sesi Login Aktif
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="space-y-5 px-5 py-6">
                {/* ERROR */}
                {errorMessage && (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                        <AlertCircle
                            size={20}
                            className="shrink-0 text-amber-600"
                        />

                        <p className="text-xs leading-5 text-amber-700">
                            {errorMessage}
                        </p>
                    </div>
                )}

                <section>
                    <h3 className="mb-3 text-base font-extrabold text-slate-900">
                        Informasi Pribadi
                    </h3>

                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                        {/* NAME */}
                        <div className="flex items-start gap-3 border-b border-slate-100 p-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <UserRound size={19} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-400">
                                    Nama Lengkap
                                </p>

                                <p className="mt-1 wrap-break-word text-sm font-semibold text-slate-800">
                                    {customerName}
                                </p>
                            </div>
                        </div>

                        {/* EMAIL */}
                        <div className="flex items-start gap-3 border-b border-slate-100 p-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                                <Mail size={19} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-400">
                                    Email
                                </p>

                                <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                                    {customerEmail}
                                </p>
                            </div>
                        </div>

                        {/* PHONE */}
                        <div className="flex items-start gap-3 border-b border-slate-100 p-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                                <Phone size={19} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-400">
                                    Nomor Telepon
                                </p>

                                <p className="mt-1 wrap-break-word text-sm font-semibold text-slate-800">
                                    {customerPhone}
                                </p>
                            </div>
                        </div>

                        {/* CUSTOMER ID */}
                        <div className="flex items-start gap-3 p-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                <IdCard size={19} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-400">
                                    Customer ID
                                </p>

                                <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                                    {customerId}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="mb-3 text-base font-extrabold text-slate-900">
                        Aktivitas Saya
                    </h3>

                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                        {/* HISTORY */}
                        <button
                            type="button"
                            onClick={() =>
                                navigate("/customer/history")
                            }
                            className="flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left transition hover:bg-slate-50"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <History size={21} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-800">
                                    Riwayat Pesanan
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Lihat transaksi dan status pesanan
                                </p>
                            </div>

                            <ChevronRight
                                size={19}
                                className="text-slate-400"
                            />
                        </button>

                        {/* HEALTH PASS */}
                        <button
                            type="button"
                            onClick={() =>
                                navigate("/customer/health-pass")
                            }
                            className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                <Ticket size={21} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-800">
                                    Health Pass Saya
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Akses tiket layanan dan QR Code
                                </p>
                            </div>

                            <ChevronRight
                                size={19}
                                className="text-slate-400"
                            />
                        </button>
                    </div>
                </section>

                <section>
                    <h3 className="mb-3 text-base font-extrabold text-slate-900">
                        Keamanan Akun
                    </h3>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                <ShieldCheck size={22} />
                            </div>

                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    Autentikasi Customer
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Akses riwayat pesanan, Health Pass,
                                    dan informasi pribadi dilindungi
                                    menggunakan sesi autentikasi.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3">
                            <CheckCircle2
                                size={17}
                                className="text-emerald-600"
                            />

                            <p className="text-xs font-medium text-emerald-700">
                                Anda sedang login sebagai customer.
                            </p>
                        </div>
                    </div>
                </section>

                <section>
                    <button
                        type="button"
                        onClick={() =>
                            setShowLogoutModal(true)
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-4 text-sm font-bold text-red-600 transition hover:bg-red-50"
                    >
                        <LogOut size={19} />
                        Keluar dari Akun
                    </button>

                    <p className="mt-4 text-center text-[11px] text-slate-400">
                        STIQR Health
                    </p>
                </section>
            </div>

            {showLogoutModal && (
                <div
                    className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-5"
                    role="presentation"
                    onClick={() =>
                        setShowLogoutModal(false)
                    }
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="logout-modal-title"
                        className="w-full max-w-95 rounded-3xl bg-white p-6 shadow-xl"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        {/* MODAL HEADER */}
                        <div className="flex items-start justify-between">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                                <LogOut size={27} />
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowLogoutModal(false)
                                }
                                aria-label="Tutup konfirmasi"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <h3
                            id="logout-modal-title"
                            className="mt-5 text-xl font-extrabold text-slate-900"
                        >
                            Keluar dari Akun?
                        </h3>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            Anda akan keluar dari akun STIQR Health.
                            Untuk mengakses kembali riwayat pesanan
                            dan Health Pass, Anda perlu login lagi.
                        </p>

                        {/* ACTION BUTTONS */}
                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowLogoutModal(false)
                                }
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                            >
                                Batal
                            </button>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                            >
                                Ya, Keluar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
