import {
    useEffect,
    useState,
    type ReactNode,
} from "react";

import { useNavigate } from "react-router-dom";

import {
    AlertCircle,
    Bell,
    ChevronDown,
    ChevronRight,
    IdCard,
    Info,
    LogOut,
    MessageCircle,
    RefreshCw,
    ShieldCheck,
    Ticket,
    UserRound,
    X,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

interface Customer {
    id_customer?: number | string;
    name_customer?: string;
    email_customer?: string;
    phone_number_customer?: string;
    gender_customer?: string;
    dob_customer?: string;
    date_of_birth?: string;
    address_customer?: string;
}

type CustomerRecord = Customer & {
    customer?: Customer;
    data?: Customer | { customer?: Customer };
};

interface MenuItemProps {
    icon: ReactNode;
    title: string;
    description?: string;
    onClick: () => void;
    expanded?: boolean;
    iconBackground?: string;
}

const getCustomerData = (): Customer | null => {
    try {
        const stored = localStorage.getItem("customer_data");

        if (!stored) return null;

        const parsed = JSON.parse(stored) as CustomerRecord;

        if (!parsed || typeof parsed !== "object") {
            return null;
        }

        // Mendukung struktur data dari login sebelumnya.
        if (parsed.customer) {
            return parsed.customer;
        }

        if (parsed.data) {
            if (
                "customer" in parsed.data &&
                parsed.data.customer
            ) {
                return parsed.data.customer;
            }

            return parsed.data as Customer;
        }

        return parsed;
    } catch (error) {
        console.error("[CUSTOMER DATA ERROR]", error);
        return null;
    }
};

const getInitials = (name: string): string => {
    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) return "U";

    // Mengikuti screenshot: menggunakan huruf awal nama.
    return words[0].charAt(0).toUpperCase();
};

const MenuItem = ({
    icon,
    title,
    description,
    onClick,
    expanded = false,
    iconBackground = "bg-blue-50",
}: MenuItemProps) => {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-expanded={expanded ? true : undefined}
            className="
                flex w-full cursor-pointer items-center gap-3
                rounded-2xl border border-[#D8E4F2]
                bg-white px-4 py-3.5 text-left
                transition hover:border-blue-300 hover:bg-blue-50/30
                active:scale-[0.995]
            "
        >
            {/* ICON */}
            <div
                className={`
          flex h-9 w-9 shrink-0 items-center justify-center
          rounded-xl text-[#0872E5] ${iconBackground}
        `}
            >
                {icon}
            </div>

            {/* TITLE & DESCRIPTION */}
            <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold leading-snug text-[#002C65]">
                    {title}
                </p>

                {description && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[#526787]">
                        {description}
                    </p>
                )}
            </div>

            {/* CHEVRON */}
            {expanded ? (
                <ChevronDown
                    size={16}
                    className="shrink-0 text-[#003B80]"
                />
            ) : (
                <ChevronRight
                    size={16}
                    className="shrink-0 text-[#003B80]"
                />
            )}
        </button>
    );
};

const Profile = () => {
    const navigate = useNavigate();

    const [customer, setCustomer] = useState<Customer | null>(
        null
    );

    const [loading, setLoading] = useState(true);

    const [showLogoutModal, setShowLogoutModal] =
        useState(false);

    const [errorMessage, setErrorMessage] = useState("");

    const [notification, setNotification] = useState("");

    const redirectToLogin = () => {
        sessionStorage.removeItem("customer_token");
        localStorage.removeItem("customer_data");

        navigate(
            "/customer/sign-in?redirect=%2Fcustomer%2Fprofile",
            { replace: true }
        );
    };

    useEffect(() => {
        const token = sessionStorage.getItem("customer_token");

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

    const showUnavailableNotification = (
        feature: string
    ) => {
        setNotification(
            `Fitur ${feature} belum tersedia saat ini.`
        );
    };

    useEffect(() => {
        if (!notification) return;

        const timeout = window.setTimeout(() => {
            setNotification("");
        }, 3500);

        return () => window.clearTimeout(timeout);
    }, [notification]);

    const handleLogout = () => {
        sessionStorage.removeItem("customer_token");
        localStorage.removeItem("customer_data");

        // Bersihkan token legacy jika ada.
        localStorage.removeItem("customer_token");

        setCustomer(null);
        setShowLogoutModal(false);

        navigate("/customer/sign-in", {
            replace: true,
        });
    };

    const handleSupport = () => {
        // Nomor WhatsApp resmi Bantuan STIQR Health
        const supportNumber = "6285218596185";

        // Pesan otomatis ketika WhatsApp dibuka
        const message = encodeURIComponent(
            "Halo STIQR Health, saya ingin meminta bantuan terkait layanan STIQR Health."
        );

        // Membuka WhatsApp pada tab baru atau aplikasi WhatsApp
        window.open(
            `https://wa.me/${supportNumber}?text=${message}`,
            "_blank",
            "noopener,noreferrer"
        );
    };

    const customerName =
        customer?.name_customer?.trim() || "Customer STIQR";

    const customerEmail =
        customer?.email_customer?.trim() || "-";

    const initials = getInitials(customerName);

    if (loading) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center bg-[#F5F8FC]">
                <div className="text-center">
                    <RefreshCw
                        size={28}
                        className="mx-auto animate-spin text-blue-600"
                    />

                    <p className="mt-3 text-sm text-slate-500">
                        Memuat profil...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F8FC] text-[#002C65]">
            {notification && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed left-1/2 top-4 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2"
                >
                    <div className="flex items-start gap-3 rounded-2xl border border-[#D7E5F5] bg-white p-4 shadow-xl">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Info size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#002C65]">
                                Fitur belum tersedia
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                {notification}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setNotification("")}
                            aria-label="Tutup notifikasi"
                            className="cursor-pointer text-slate-400 hover:text-slate-700"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            <main className="mx-auto w-full max-w-lg space-y-3 px-4.5 pb-28 pt-4">
                <section className="rounded-[18px] border border-[#D8E4F2] bg-white px-4 py-4">
                    <div className="flex items-center gap-3">
                        {/* AVATAR */}
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E7F2FF] text-xl font-bold text-[#0872E5]">
                            {initials}
                        </div>

                        {/* USER DATA */}
                        <div className="min-w-0 flex-1">
                            <h2 className="truncate text-[15px] font-bold text-[#002C65]">
                                {customerName}
                            </h2>

                            <p className="mt-0.5 truncate text-[12px] text-[#526787]">
                                {customerEmail}
                            </p>
                        </div>
                    </div>
                </section>

                {errorMessage && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <AlertCircle
                            size={18}
                            className="shrink-0 text-amber-600"
                        />

                        <p className="text-xs leading-relaxed text-amber-700">
                            {errorMessage}
                        </p>
                    </div>
                )}

                <MenuItem
                    icon={<UserRound size={19} />}
                    title="Data diri"
                    description="Dipakai otomatis saat beli untuk diri sendiri"
                    onClick={() => navigate("/customer/personal-data")}
                />

                <MenuItem
                    icon={<ShieldCheck size={19} />}
                    title="Asuransi / benefit kantor"
                    description="Hubungkan kartu, lihat sisa benefit"
                    onClick={() =>
                        showUnavailableNotification(
                            "Asuransi / Benefit Kantor"
                        )
                    }
                />

                <MenuItem
                    icon={<Bell size={19} />}
                    title="Notifikasi"
                    onClick={() =>
                        showUnavailableNotification("Notifikasi")
                    }
                />

                <MenuItem
                    icon={<MessageCircle size={19} />}
                    title="Bantuan STIQR Health"
                    description="WhatsApp"
                    onClick={handleSupport}
                />

                <MenuItem
                    icon={<Ticket size={19} />}
                    title="Syarat & Ketentuan"
                    onClick={() => navigate("/customer/terms-conditions")}
                />

                <MenuItem
                    icon={<ShieldCheck size={19} />}
                    title="Kebijakan Privasi"
                    onClick={() => navigate("/customer/privacy-policy")}
                />

                <div className="pt-2">
                    <p className="mb-3 text-xs font-semibold text-[#526787]">
                        Aktivitas akun
                    </p>

                    <div className="space-y-3">
                        <MenuItem
                            icon={<RefreshCw size={19} />}
                            title="Riwayat Pesanan"
                            description="Lihat transaksi dan status pesanan"
                            onClick={() =>
                                navigate("/customer/history")
                            }
                        />

                        <MenuItem
                            icon={<IdCard size={19} />}
                            title="Health Pass Saya"
                            description="Akses tiket layanan dan QR Code"
                            onClick={() =>
                                navigate("/customer/health-pass")
                            }
                        />
                    </div>
                </div>

                <section className="pt-1">
                    <button
                        type="button"
                        onClick={() => setShowLogoutModal(true)}
                        className="
                            flex h-13 w-full cursor-pointer
                            items-center justify-center
                            rounded-2xl border border-[#BDD0E7]
                            bg-white text-sm font-bold text-[#002C65]
                            transition hover:border-blue-300 hover:bg-blue-50
                        "
                    >
                        Keluar
                    </button>

                    {/* Logout all devices not implemented yet */}
                    <button
                        type="button"
                        onClick={() =>
                            showUnavailableNotification(
                                "Keluar dari Semua Perangkat"
                            )
                        }
                        className="mt-4 w-full cursor-pointer py-3 text-center text-xs font-semibold text-[#526787] transition hover:text-blue-600"
                    >
                        Keluar dari semua perangkat
                    </button>
                </section>
            </main>

            {showLogoutModal && (
                <div
                    className="fixed inset-0 flex items-center justify-center bg-black/45 p-5 z-100"
                    role="presentation"
                    onClick={() => setShowLogoutModal(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="logout-modal-title"
                        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                                <LogOut size={24} />
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowLogoutModal(false)
                                }
                                aria-label="Tutup konfirmasi logout"
                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-500"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <h3
                            id="logout-modal-title"
                            className="mt-5 text-lg font-bold text-[#002C65]"
                        >
                            Keluar dari Akun?
                        </h3>

                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                            Kamu akan keluar dari akun STIQR Health di
                            browser ini. Untuk mengakses kembali riwayat
                            pesanan dan Health Pass, kamu perlu masuk lagi.
                        </p>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowLogoutModal(false)
                                }
                                className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
                            >
                                Batal
                            </button>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex-1 cursor-pointer rounded-xl bg-[#0872E5] px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
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
