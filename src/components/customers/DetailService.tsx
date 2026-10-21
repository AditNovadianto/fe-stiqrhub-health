import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock3,
    FileText,
    Loader2,
    MapPin,
    ShieldCheck,
    Users,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

interface Service {
    id_service: number;
    name_service: string;
    price_service: string | number;
    image_service: string | null;
    description_service: string | null;
    status_service: string;
    maps_service: string | null;
    quota_service: string | number;
    id_provider: number;
    name_provider?: string;
}

interface DetailServiceData {
    id_detail_service: number;
    benefits: string | null;
    location: string | null;
    hour: string | null;
    terms_and_conditions: string | null;
    included_services: string | null;
    id_service: number;
}

interface ApiResponse<T> {
    success: boolean;
    data: T | T[];
    message?: string;
}

const formatRupiah = (value: string | number): string => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "Rp0";
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const parseList = (value?: string | null): string[] => {
    if (!value) return [];

    return value
        .split(/[,\n]+/)
        .map((item) => item.trim())
        .filter(Boolean);
};

const getFirstItem = <T,>(
    data: T | T[] | null | undefined,
): T | null => {
    if (data == null) return null;

    return Array.isArray(data)
        ? data[0] ?? null
        : data;
};

const fetchApi = async <T,>(
    endpoint: string,
    signal: AbortSignal,
): Promise<T | T[]> => {
    const response = await fetch(`${import.meta.env.VITE_API_URI}${endpoint}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
        },
        signal,
    });

    const result = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !result.success) {
        throw new Error(
            result.message ||
            `Request gagal (${response.status})`,
        );
    }

    if (result.data == null) {
        throw new Error("Data tidak tersedia.");
    }

    return result.data;
};

const DetailService = () => {
    const navigate = useNavigate();

    const { id_service } = useParams<{
        id_service: string;
    }>();

    const serviceId = Number(id_service);

    const validServiceId =
        id_service !== undefined &&
        Number.isSafeInteger(serviceId) &&
        serviceId > 0;

    const [service, setService] = useState<Service | null>(
        null,
    );

    const [detailServices, setDetailServices] = useState<
        DetailServiceData[]
    >([]);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [detailError, setDetailError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        const fetchServiceDetail = async () => {
            setLoading(true);
            setErrorMessage("");
            setDetailError("");
            setService(null);
            setDetailServices([]);

            if (!validServiceId) {
                setErrorMessage("ID layanan tidak valid.");
                setLoading(false);
                return;
            }

            try {
                const serviceData = await fetchApi<Service>(
                    `/service/${serviceId}`,
                    controller.signal,
                );

                if (controller.signal.aborted) return;

                const selectedService = getFirstItem(serviceData);

                if (!selectedService) {
                    throw new Error("Layanan tidak ditemukan.");
                }

                if (
                    Number(selectedService.id_service) !== serviceId
                ) {
                    throw new Error("Data layanan tidak sesuai.");
                }

                setService(selectedService);

                // Detail tambahan tidak menggagalkan
                // keseluruhan halaman bila tidak tersedia.
                try {
                    const detailData =
                        await fetchApi<DetailServiceData>(
                            `/detail-service/service/${serviceId}`,
                            controller.signal,
                        );

                    if (controller.signal.aborted) return;

                    const details = Array.isArray(detailData)
                        ? detailData
                        : [detailData];

                    setDetailServices(
                        details.filter(
                            (detail) =>
                                Number(detail.id_service) === serviceId,
                        ),
                    );
                } catch (error) {
                    if (controller.signal.aborted) return;

                    setDetailError(
                        error instanceof Error
                            ? error.message
                            : "Informasi tambahan layanan belum tersedia.",
                    );
                }
            } catch (error) {
                if (controller.signal.aborted) return;

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Gagal mengambil detail layanan.",
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchServiceDetail();

        return () => controller.abort();
    }, [serviceId, validServiceId]);

    const getUniqueItems = (
        field:
            | "benefits"
            | "included_services"
            | "terms_and_conditions",
    ): string[] => {
        return [
            ...new Set(
                detailServices.flatMap((detail) =>
                    parseList(detail[field]),
                ),
            ),
        ];
    };

    const benefits = getUniqueItems("benefits");

    const includedServices =
        getUniqueItems("included_services");

    const termsAndConditions =
        getUniqueItems("terms_and_conditions");

    const locations = [
        ...new Set(
            detailServices.flatMap((detail) =>
                parseList(detail.location),
            ),
        ),
    ];

    const hours = [
        ...new Set(
            detailServices.flatMap((detail) =>
                parseList(detail.hour),
            ),
        ),
    ];

    const quota = Number(service?.quota_service ?? 0);

    const isActive =
        service?.status_service === "ACTIVE";

    const hasQuota =
        Number.isFinite(quota) && quota > 0;

    const canBook = isActive && hasQuota;

    const handleBooking = () => {
        if (!service || !canBook) return;

        const bookingPath =
            `/customer/booking/${service.id_service}`;

        const token = sessionStorage.getItem(
            "customer_token",
        );

        if (!token || isTokenExpired(token)) {
            sessionStorage.removeItem("customer_token");
            localStorage.removeItem("customer_data");

            navigate(
                `/customer/sign-in?redirect=${encodeURIComponent(
                    bookingPath,
                )}`,
            );

            return;
        }

        navigate(bookingPath);
    };

    if (loading) {
        return (
            <div className="flex min-h-[65vh] flex-col items-center justify-center gap-4 bg-slate-50 px-5">
                <Loader2
                    size={34}
                    className="animate-spin text-blue-600"
                />

                <p className="text-sm text-slate-500">
                    Memuat detail layanan...
                </p>
            </div>
        );
    }

    if (errorMessage || !service) {
        return (
            <div className="flex min-h-[65vh] flex-col items-center justify-center bg-slate-50 px-5 text-center">
                <AlertCircle
                    size={48}
                    className="text-red-400"
                />

                <h2 className="mt-4 text-xl font-bold text-slate-900">
                    Layanan Tidak Ditemukan
                </h2>

                <p className="mt-2 max-w-md text-sm text-slate-500">
                    {errorMessage ||
                        "Layanan yang Anda cari tidak tersedia."}
                </p>

                <button
                    type="button"
                    onClick={() => navigate("/customer/home")}
                    className="mt-6 cursor-pointer rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                    Kembali ke Beranda
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-40 text-slate-900">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
                {/* BACK BUTTON */}
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="mb-5 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
                >
                    <ArrowLeft size={18} />
                    Kembali
                </button>

                <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                    {/* SERVICE IMAGE */}
                    <div className="relative h-56 overflow-hidden bg-blue-50 sm:h-80">
                        {service.image_service ? (
                            <img
                                src={service.image_service}
                                alt={service.name_service}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm font-medium text-blue-500">
                                Foto layanan dari provider
                            </div>
                        )}

                        {/* STATUS BADGE */}
                        <div className="absolute bottom-4 left-4">
                            <span
                                className={`rounded-full px-4 py-2 text-xs font-bold shadow-sm ${canBook
                                    ? "bg-emerald-500 text-white"
                                    : "bg-red-500 text-white"
                                    }`}
                            >
                                {canBook
                                    ? "Layanan Tersedia"
                                    : "Tidak Tersedia"}
                            </span>
                        </div>
                    </div>

                    {/* SERVICE HEADER */}
                    <div className="p-5 sm:p-8">
                        {/* PROVIDER */}
                        <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                            <Building2 size={17} />
                            <span>
                                {service.name_provider ||
                                    "Provider kesehatan"}
                            </span>
                        </div>

                        {/* SERVICE NAME */}
                        <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                            {service.name_service}
                        </h1>

                        {/* QUOTA & SCHEDULE */}
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <Users size={21} />
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500">
                                        Kuota Tersedia
                                    </p>

                                    <p className="mt-1 text-sm font-bold text-slate-800">
                                        {Number.isFinite(quota)
                                            ? quota
                                            : "-"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <CalendarDays size={21} />
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500">
                                        Jadwal Pelayanan
                                    </p>

                                    <p className="mt-1 text-sm font-bold text-slate-800">
                                        Pilih saat booking
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    {/* ABOUT SERVICE */}
                    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <ShieldCheck
                                size={20}
                                className="text-blue-600"
                            />
                            Tentang Layanan
                        </h2>

                        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                            {service.description_service ||
                                "Deskripsi layanan belum tersedia."}
                        </p>

                        {/* BENEFITS */}
                        {benefits.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-sm font-bold text-slate-800">
                                    Manfaat Layanan
                                </h3>

                                <ul className="mt-3 space-y-3">
                                    {benefits.map((benefit) => (
                                        <li
                                            key={benefit}
                                            className="flex items-start gap-3 text-sm text-slate-600"
                                        >
                                            <CheckCircle2
                                                size={18}
                                                className="mt-0.5 shrink-0 text-emerald-500"
                                            />

                                            <span>{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>

                    {/* INCLUDED SERVICES */}
                    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <CheckCircle2
                                size={20}
                                className="text-blue-600"
                            />
                            Termasuk dalam Layanan
                        </h2>

                        {includedServices.length > 0 ? (
                            <ul className="mt-4 space-y-3">
                                {includedServices.map((included) => (
                                    <li
                                        key={included}
                                        className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
                                    >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                            <CheckCircle2 size={17} />
                                        </div>

                                        <span className="text-sm font-medium text-slate-700">
                                            {included}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-3 text-sm text-slate-500">
                                Rincian layanan belum tersedia.
                            </p>
                        )}
                    </section>

                    {/* LOCATION & HOURS */}
                    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <MapPin
                                size={20}
                                className="text-blue-600"
                            />
                            Lokasi & Jam Operasional
                        </h2>

                        <div className="mt-4 space-y-4">
                            {locations.length === 0 &&
                                hours.length === 0 && (
                                    <p className="text-sm text-slate-500">
                                        Informasi lokasi dan jam operasional belum tersedia.
                                    </p>
                                )}

                            {locations.map((location) => (
                                <div
                                    key={location}
                                    className="flex items-start gap-3"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        <MapPin size={19} />
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Lokasi Pelayanan
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-700">
                                            {location}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {hours.map((hour) => (
                                <div
                                    key={hour}
                                    className="flex items-start gap-3"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                                        <Clock3 size={19} />
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Jam Operasional
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-700">
                                            {hour}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* GOOGLE MAPS */}
                            {service.maps_service &&
                                /^https?:\/\//i.test(
                                    service.maps_service,
                                ) && (
                                    <a
                                        href={service.maps_service}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                                    >
                                        <span className="flex items-center gap-2">
                                            <MapPin size={17} />
                                            Lihat Lokasi di Maps
                                        </span>

                                        <ChevronRight size={17} />
                                    </a>
                                )}
                        </div>
                    </section>

                    {/* TERMS & CONDITIONS */}
                    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <FileText
                                size={20}
                                className="text-blue-600"
                            />
                            Syarat & Ketentuan
                        </h2>

                        {termsAndConditions.length > 0 ? (
                            <ol className="mt-4 space-y-3">
                                {termsAndConditions.map((term, index) => (
                                    <li
                                        key={`${term}-${index}`}
                                        className="flex items-start gap-3"
                                    >
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                                            {index + 1}
                                        </div>

                                        <p className="text-sm leading-6 text-slate-600">
                                            {term}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="mt-3 text-sm text-slate-500">
                                Belum ada ketentuan tambahan.
                            </p>
                        )}
                    </section>
                </div>

                {/* DETAIL WARNING */}
                {detailError && (
                    <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
                        <AlertCircle
                            size={19}
                            className="shrink-0 text-amber-600"
                        />

                        <p className="text-sm text-amber-700">
                            Informasi tambahan layanan: {detailError}
                        </p>
                    </div>
                )}
            </div>

            <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-1/2 z-40 w-full max-w-130 -translate-x-1/2 border-t border-slate-100 bg-white px-5 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between gap-4">
                    {/* PRICE */}
                    <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                            Total Harga
                        </p>

                        <p className="text-lg font-extrabold text-blue-600 sm:text-xl">
                            {formatRupiah(service.price_service)}
                        </p>
                    </div>

                    {/* BOOKING BUTTON */}
                    <button
                        type="button"
                        onClick={handleBooking}
                        disabled={!canBook}
                        className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition sm:px-8 ${canBook
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                            : "cursor-not-allowed bg-slate-200 text-slate-400"
                            }`}
                    >
                        <CalendarDays size={18} />

                        {canBook
                            ? "Booking Sekarang"
                            : "Tidak Tersedia"}

                        {canBook && (
                            <ChevronRight size={17} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DetailService;
