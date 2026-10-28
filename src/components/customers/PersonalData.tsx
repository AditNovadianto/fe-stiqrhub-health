import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    CalendarDays,
    IdCard,
    Mail,
    MapPin,
    Phone,
    RefreshCw,
    UserRound,
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

const getCustomerData = (): Customer | null => {
    try {
        const stored = localStorage.getItem("customer_data");

        if (!stored) return null;

        const parsed = JSON.parse(stored) as CustomerRecord;

        if (!parsed || typeof parsed !== "object") {
            return null;
        }

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
        console.error("[PERSONAL DATA ERROR]", error);
        return null;
    }
};

const formatValue = (
    value?: string | number | null
): string => {
    if (value === undefined || value === null) {
        return "-";
    }

    const result = String(value).trim();

    return result || "-";
};

const formatDate = (
    value?: string
): string => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
};

const PersonalData = () => {
    const navigate = useNavigate();

    const [customer, setCustomer] = useState<Customer | null>(
        null
    );

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = sessionStorage.getItem("customer_token");

        if (!token || isTokenExpired(token)) {
            sessionStorage.removeItem("customer_token");
            localStorage.removeItem("customer_data");

            navigate(
                "/customer/sign-in?redirect=%2Fcustomer%2Fpersonal-data",
                { replace: true }
            );

            return;
        }

        const customerData = getCustomerData();

        setCustomer(customerData);
        setLoading(false);
    }, [navigate]);

    const customerName = formatValue(
        customer?.name_customer
    );

    const customerEmail = formatValue(
        customer?.email_customer
    );

    const customerPhone = formatValue(
        customer?.phone_number_customer
    );

    const customerGender = formatValue(
        customer?.gender_customer
    );

    const customerBirthDate = formatDate(
        customer?.dob_customer ||
        customer?.date_of_birth
    );

    const customerAddress = formatValue(
        customer?.address_customer
    );

    const customerId = formatValue(
        customer?.id_customer
    );

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F5F8FC]">
                <RefreshCw
                    size={28}
                    className="animate-spin text-blue-600"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F8FC] text-[#002C65]">
            {/* MAIN CONTENT */}
            <main className="mx-auto w-full max-w-lg space-y-4 px-4 pb-24 pt-5">
                {/* INTRODUCTION */}
                <div>
                    <h2 className="text-lg font-bold">
                        Informasi pribadi
                    </h2>

                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Informasi ini digunakan untuk mengenali akun kamu
                        dan membantu proses pembelian layanan kesehatan.
                    </p>
                </div>

                {/* PERSONAL INFORMATION */}
                <div className="overflow-hidden rounded-2xl border border-[#D8E4F2] bg-white">
                    {[
                        {
                            label: "Nama lengkap",
                            value: customerName,
                            icon: <UserRound size={19} />,
                        },
                        {
                            label: "Email",
                            value: customerEmail,
                            icon: <Mail size={19} />,
                        },
                        {
                            label: "Nomor telepon",
                            value: customerPhone,
                            icon: <Phone size={19} />,
                        },
                        {
                            label: "Jenis kelamin",
                            value: customerGender,
                            icon: <UserRound size={19} />,
                        },
                        {
                            label: "Tanggal lahir",
                            value: customerBirthDate,
                            icon: <CalendarDays size={19} />,
                        },
                        {
                            label: "Alamat",
                            value: customerAddress,
                            icon: <MapPin size={19} />,
                        },
                        {
                            label: "Customer ID",
                            value: customerId,
                            icon: <IdCard size={19} />,
                        },
                    ].map((item, index, items) => (
                        <div
                            key={item.label}
                            className={`flex items-start gap-3 px-4 py-4 ${index < items.length - 1
                                ? "border-b border-slate-100"
                                : ""
                                }`}
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                {item.icon}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-500">
                                    {item.label}
                                </p>

                                <p className="mt-1 wrap-break-word text-sm font-semibold text-[#002C65]">
                                    {item.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* INFORMATION */}
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <p className="text-xs leading-relaxed text-[#365D88]">
                        Data yang ditampilkan mengikuti informasi akun
                        customer yang tersimpan saat login. Jika terdapat
                        informasi yang belum tersedia, kolom akan
                        menampilkan tanda "-".
                    </p>
                </div>
            </main>
        </div>
    );
};

export default PersonalData;
