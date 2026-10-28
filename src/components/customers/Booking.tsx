import {
    useEffect,
    useState,
    type FormEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    CreditCard,
    Info,
    Loader2,
    LockKeyhole,
    Mail,
    QrCode,
    ShieldCheck,
    UserRound,
    Users,
    Wallet,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

interface Service {
    id_service: number;
    name_service: string;
    price_service: string | number;
    quota_service: string | number;
    status_service: string;
    name_provider?: string;
}

interface Customer {
    id_customer: number;
    name_customer: string;
    email_customer: string;
    phone_number_customer: string;
    dob_customer: string;
    gender_customer: string;
}

interface Guest {
    id_guest: number;
    id_customer: number;
    name_guest: string;
    email_guest: string;
    gender_guest: string;
    phone_number_guest: string | null;
}

interface GuestForm {
    name_guest: string;
    email_guest: string;
    gender_guest: string;
    phone_number_guest: string;
}

interface ApiResponse<T> {
    success?: boolean;
    message?: string;
    data?: T | T[];
}

type BookingStep = "SCHEDULE" | "PATIENT" | "PAYMENT";
type RecipientType = "SELF" | "GUEST";
type GuestMode = "SAVED" | "NEW";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TIME_SLOTS = [
    "09:00",
    "10:00",
    "11:00",
    "13:00",
    "14:00",
    "15:00",
];

const WEEK_DAYS = [
    "Min",
    "Sen",
    "Sel",
    "Rab",
    "Kam",
    "Jum",
    "Sab",
];

const MONTHS = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
];

const EMPTY_GUEST: GuestForm = {
    name_guest: "",
    email_guest: "",
    gender_guest: "",
    phone_number_guest: "",
};

const toDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(
        2,
        "0",
    );
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string): Date => {
    const [year, month, day] = value.split("-").map(Number);

    return new Date(year, month - 1, day);
};

const toDayStart = (date: Date): Date => {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    );
};

const formatDate = (value: string): string => {
    if (!value) return "-";

    const date = parseDateKey(value);

    return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
};

const formatCurrency = (
    value: string | number,
): string => {
    const amount = Number(value);

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
};

const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase();
};

const formatGender = (value?: string): string => {
    switch (value?.toUpperCase()) {
        case "MALE":
            return "Laki-laki";
        case "FEMALE":
            return "Perempuan";
        default:
            return "-";
    }
};

const formatBirthDate = (value?: string): string => {
    if (!value) return "-";

    const datePart = value.slice(0, 10);
    const parsed = new Date(`${datePart}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(parsed);
};

async function fetchData<T>(
    endpoint: string,
    token?: string,
    signal?: AbortSignal,
): Promise<T | T[]> {
    const response = await fetch(
        `${import.meta.env.VITE_API_URI}${endpoint}`,
        {
            method: "GET",
            headers: {
                Accept: "application/json",
                ...(token
                    ? { Authorization: `Bearer ${token}` }
                    : {}),
            },
            signal,
        },
    );

    let result: ApiResponse<T>;

    try {
        result = (await response.json()) as ApiResponse<T>;
    } catch {
        throw new Error(
            "Respons server tidak valid. Silakan coba lagi.",
        );
    }

    if (!response.ok || result.success === false) {
        throw new Error(
            result.message ||
            `Permintaan gagal (${response.status}).`,
        );
    }

    if (result.data == null) {
        throw new Error(
            "Data yang diminta tidak tersedia.",
        );
    }

    return result.data;
}

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";

const labelClass =
    "mb-2 block text-sm font-semibold text-slate-700";

const primaryButton =
    "cursor-pointer inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300";

const cardClass =
    "rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7";

const Booking = () => {
    const navigate = useNavigate();

    const { id_service } = useParams<{
        id_service: string;
    }>();

    const serviceId = Number(id_service);

    const [service, setService] =
        useState<Service | null>(null);

    const [customer, setCustomer] =
        useState<Customer | null>(null);

    const [guests, setGuests] = useState<Guest[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [step, setStep] =
        useState<BookingStep>("SCHEDULE");

    // Calendar
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");

    const [displayMonth, setDisplayMonth] = useState(
        new Date().getMonth(),
    );

    const [displayYear, setDisplayYear] = useState(
        new Date().getFullYear(),
    );

    // Patient
    const [recipient, setRecipient] =
        useState<RecipientType>("SELF");

    const [guestMode, setGuestMode] =
        useState<GuestMode>("NEW");

    const [selectedGuestId, setSelectedGuestId] =
        useState("");

    const [guestForm, setGuestForm] =
        useState<GuestForm>({ ...EMPTY_GUEST });

    const [consent, setConsent] = useState(false);

    const today = toDayStart(new Date());

    const maximumDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 90,
    );

    const todayKey = toDateKey(today);

    const maxDateKey = toDateKey(maximumDate);

    const todayMonthIndex =
        today.getFullYear() * 12 + today.getMonth();

    const maxMonthIndex =
        maximumDate.getFullYear() * 12 +
        maximumDate.getMonth();

    const displayMonthIndex =
        displayYear * 12 + displayMonth;

    const canGoPrevious =
        displayMonthIndex > todayMonthIndex;

    const canGoNext =
        displayMonthIndex < maxMonthIndex;

    useEffect(() => {
        const controller = new AbortController();

        const loadBooking = async () => {
            try {
                setLoading(true);
                setError("");

                if (
                    !Number.isSafeInteger(serviceId) ||
                    serviceId <= 0
                ) {
                    throw new Error("ID layanan tidak valid.");
                }

                const token = sessionStorage.getItem(
                    "customer_token",
                );

                if (!token || isTokenExpired(token)) {
                    sessionStorage.removeItem("customer_token");

                    const bookingPath =
                        `/customer/booking/${serviceId}`;

                    navigate(
                        `/customer/sign-in?redirect=${encodeURIComponent(
                            bookingPath,
                        )}`,
                        { replace: true },
                    );

                    return;
                }

                const savedCustomer =
                    localStorage.getItem("customer_data");

                if (!savedCustomer) {
                    throw new Error(
                        "Profil customer tidak ditemukan. Silakan login ulang.",
                    );
                }

                let parsedCustomer: Customer;

                try {
                    parsedCustomer = JSON.parse(
                        savedCustomer,
                    ) as Customer;
                } catch {
                    throw new Error(
                        "Data profil customer tidak valid.",
                    );
                }

                if (
                    !parsedCustomer?.id_customer ||
                    !parsedCustomer.email_customer
                ) {
                    throw new Error(
                        "Data customer belum lengkap. Silakan login ulang.",
                    );
                }

                const [serviceResult, guestResult] =
                    await Promise.all([
                        fetchData<Service>(
                            `/service/${serviceId}`,
                            undefined,
                            controller.signal,
                        ),
                        fetchData<Guest>(
                            "/guest/get-all",
                            token,
                            controller.signal,
                        ),
                    ]);

                if (controller.signal.aborted) return;

                const selectedService = Array.isArray(
                    serviceResult,
                )
                    ? serviceResult[0]
                    : serviceResult;

                if (
                    !selectedService ||
                    Number(selectedService.id_service) !==
                    serviceId
                ) {
                    throw new Error(
                        "Layanan tidak ditemukan.",
                    );
                }

                const guestList = (
                    Array.isArray(guestResult)
                        ? guestResult
                        : [guestResult]
                ).filter(
                    (guest) =>
                        Number(guest.id_customer) ===
                        Number(parsedCustomer.id_customer),
                );

                setService(selectedService);
                setCustomer(parsedCustomer);
                setGuests(guestList);

                if (guestList.length > 0) {
                    setGuestMode("SAVED");
                    setSelectedGuestId(
                        String(guestList[0].id_guest),
                    );
                }
            } catch (reason) {
                if (controller.signal.aborted) return;

                setError(
                    reason instanceof Error
                        ? reason.message
                        : "Gagal memuat data booking.",
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void loadBooking();

        return () => controller.abort();
    }, [serviceId, navigate]);

    const firstDayOfMonth = new Date(
        displayYear,
        displayMonth,
        1,
    ).getDay();

    const totalDaysInMonth = new Date(
        displayYear,
        displayMonth + 1,
        0,
    ).getDate();

    const calendarCells: Array<number | null> = [
        ...Array(firstDayOfMonth).fill(null),
        ...Array.from(
            { length: totalDaysInMonth },
            (_, index) => index + 1,
        ),
    ];

    const calendarRemainder =
        (7 - (calendarCells.length % 7)) % 7;

    calendarCells.push(
        ...Array(calendarRemainder).fill(null),
    );

    const isDateAvailable = (dateKey: string) => {
        return (
            dateKey >= todayKey &&
            dateKey <= maxDateKey
        );
    };

    const isSlotAvailable = (
        dateKey: string,
        time: string,
    ) => {
        if (!isDateAvailable(dateKey)) return false;

        const dateTime = new Date(
            `${dateKey}T${time}:00`,
        );

        return (
            !Number.isNaN(dateTime.getTime()) &&
            dateTime.getTime() > Date.now()
        );
    };

    const isScheduleValid =
        Boolean(selectedDate) &&
        TIME_SLOTS.includes(selectedTime) &&
        isSlotAvailable(selectedDate, selectedTime);

    const changeCalendarMonth = (direction: number) => {
        const nextDate = new Date(
            displayYear,
            displayMonth + direction,
            1,
        );

        setDisplayMonth(nextDate.getMonth());
        setDisplayYear(nextDate.getFullYear());
    };

    const handleDateSelect = (dateKey: string) => {
        if (!isDateAvailable(dateKey)) return;

        setSelectedDate(dateKey);

        if (
            selectedTime &&
            !isSlotAvailable(dateKey, selectedTime)
        ) {
            setSelectedTime("");
        }

        setError("");
    };

    const selectedGuest =
        guests.find(
            (guest) =>
                String(guest.id_guest) ===
                selectedGuestId,
        ) || null;

    const guestPreview: GuestForm =
        guestMode === "SAVED" && selectedGuest
            ? {
                name_guest: selectedGuest.name_guest,
                email_guest: selectedGuest.email_guest,
                gender_guest: selectedGuest.gender_guest,
                phone_number_guest:
                    selectedGuest.phone_number_guest || "",
            }
            : guestForm;

    const existingGuestByEmail =
        guestMode === "NEW"
            ? guests.find(
                (guest) =>
                    normalizeEmail(guest.email_guest) ===
                    normalizeEmail(guestForm.email_guest) &&
                    Boolean(guestForm.email_guest.trim()),
            )
            : undefined;

    const canBook = Boolean(
        service &&
        service.status_service === "ACTIVE" &&
        Number(service.quota_service) > 0,
    );

    const handleScheduleSubmit = (
        e: FormEvent<HTMLFormElement>,
    ) => {
        e.preventDefault();

        setError("");

        if (!canBook) {
            setError(
                "Layanan sedang tidak tersedia atau kuota habis.",
            );
            return;
        }

        if (!isScheduleValid) {
            setError(
                "Silakan pilih tanggal dan jam kunjungan yang masih tersedia.",
            );
            return;
        }

        setStep("PATIENT");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const validatePatient = (): string => {
        if (!customer) {
            return "Data customer tidak tersedia.";
        }

        if (!consent) {
            return "Silakan setujui penggunaan data pasien terlebih dahulu.";
        }

        if (recipient === "SELF") {
            return "";
        }

        if (guestMode === "SAVED") {
            return selectedGuest
                ? ""
                : "Pilih guest yang sudah tersimpan.";
        }

        if (!guestForm.name_guest.trim()) {
            return "Nama lengkap pasien wajib diisi.";
        }

        if (
            !EMAIL_REGEX.test(
                normalizeEmail(guestForm.email_guest),
            )
        ) {
            return "Alamat email pasien tidak valid.";
        }

        if (existingGuestByEmail) {
            return "Email ini sudah terdaftar sebagai guest. Silakan pilih guest yang sudah tersimpan.";
        }

        if (
            !["MALE", "FEMALE"].includes(
                guestForm.gender_guest,
            )
        ) {
            return "Pilih jenis kelamin pasien.";
        }

        const phone = guestForm.phone_number_guest.trim();

        if (
            phone &&
            !/^\+?[0-9]{8,15}$/.test(phone)
        ) {
            return "Nomor telepon pasien tidak valid.";
        }

        return "";
    };

    const handlePatientSubmit = (
        e: FormEvent<HTMLFormElement>,
    ) => {
        e.preventDefault();

        setError("");

        const validationError = validatePatient();

        if (validationError) {
            setError(validationError);
            return;
        }

        if (!isScheduleValid) {
            setError(
                "Jadwal kunjungan sudah tidak valid. Pilih ulang jadwal.",
            );
            setStep("SCHEDULE");
            return;
        }

        // Penting:
        // Belum membuat guest ataupun order.
        // Hanya berpindah ke halaman ringkasan pembayaran.
        setStep("PAYMENT");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleBack = () => {
        setError("");

        if (step === "PAYMENT") {
            setStep("PATIENT");
        } else if (step === "PATIENT") {
            setStep("SCHEDULE");
        } else {
            navigate(
                `/customer/service/${serviceId}`,
            );
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    if (loading) {
        return (
            <div className="flex min-h-[65vh] flex-col items-center justify-center gap-3 bg-slate-50">
                <Loader2
                    size={32}
                    className="animate-spin text-blue-600"
                />

                <p className="text-sm text-slate-500">
                    Memuat halaman booking...
                </p>
            </div>
        );
    }

    if (!service || !customer) {
        return (
            <div className="mx-auto max-w-xl p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                    <AlertCircle
                        size={30}
                        className="text-red-500"
                    />

                    <h2 className="mt-3 font-bold text-red-700">
                        Booking Tidak Tersedia
                    </h2>

                    <p className="mt-2 text-sm text-red-600">
                        {error || "Data booking tidak ditemukan."}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        navigate("/customer/home")
                    }
                    className="mt-4 cursor-pointer text-sm font-semibold text-blue-600"
                >
                    Kembali ke Beranda
                </button>
            </div>
        );
    }

    const patientName =
        recipient === "SELF"
            ? customer.name_customer
            : guestPreview.name_guest;

    const patientEmail =
        recipient === "SELF"
            ? customer.email_customer
            : guestPreview.email_guest;

    const totalPrice = Number(
        service.price_service,
    );

    const pageTitle =
        step === "SCHEDULE"
            ? "Rencana Kunjungan"
            : step === "PATIENT"
                ? "Data Pasien"
                : "Pembayaran";

    const currentStep =
        step === "SCHEDULE"
            ? 1
            : step === "PATIENT"
                ? 2
                : 3;

    return (
        <div className="min-h-screen bg-slate-50 pb-28 text-slate-900">
            <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-blue-600"
                    >
                        <ArrowLeft size={19} />
                        {pageTitle}
                    </button>

                    <span className="text-xs font-medium text-slate-500">
                        Langkah {currentStep} dari 3
                    </span>
                </div>

                <div className="mb-6 flex gap-2">
                    {[1, 2, 3].map((number) => (
                        <div
                            key={number}
                            className={`h-1.5 flex-1 rounded-full ${number <= currentStep
                                ? "bg-blue-600"
                                : "bg-slate-200"
                                }`}
                        />
                    ))}
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
                    >
                        <AlertCircle
                            size={19}
                            className="mt-0.5 shrink-0 text-red-600"
                        />

                        <p className="text-sm leading-relaxed text-red-700">
                            {error}
                        </p>
                    </div>
                )}

                {step === "SCHEDULE" && (
                    <form
                        onSubmit={handleScheduleSubmit}
                        className="space-y-5"
                    >
                        <div>
                            <h1 className="text-xl font-bold text-blue-900 sm:text-2xl">
                                Kapan kamu berencana datang?
                            </h1>

                            <p className="mt-1 text-sm text-slate-500">
                                Pilih tanggal kunjungan dalam 90 hari
                                ke depan.
                            </p>
                        </div>

                        {/* CALENDAR */}
                        <section className={cardClass}>
                            {/* MONTH NAVIGATION */}
                            <div className="mb-5 flex items-center justify-between">
                                <button
                                    type="button"
                                    disabled={!canGoPrevious}
                                    onClick={() =>
                                        changeCalendarMonth(-1)
                                    }
                                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300"
                                    aria-label="Bulan sebelumnya"
                                >
                                    <ChevronLeft size={21} />
                                </button>

                                <h2 className="text-base font-bold text-slate-800">
                                    {MONTHS[displayMonth]}{" "}
                                    {displayYear}
                                </h2>

                                <button
                                    type="button"
                                    disabled={!canGoNext}
                                    onClick={() =>
                                        changeCalendarMonth(1)
                                    }
                                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300"
                                    aria-label="Bulan berikutnya"
                                >
                                    <ChevronRight size={21} />
                                </button>
                            </div>

                            {/* WEEKDAY HEADER */}
                            <div className="grid grid-cols-7 gap-1 text-center">
                                {WEEK_DAYS.map((day) => (
                                    <div
                                        key={day}
                                        className="pb-2 text-xs font-semibold text-slate-500"
                                    >
                                        {day}
                                    </div>
                                ))}

                                {/* CALENDAR DAYS */}
                                {calendarCells.map((day, index) => {
                                    if (day === null) {
                                        return (
                                            <div
                                                key={`empty-${index}`}
                                                className="aspect-square"
                                            />
                                        );
                                    }

                                    const dateKey = toDateKey(
                                        new Date(
                                            displayYear,
                                            displayMonth,
                                            day,
                                        ),
                                    );

                                    const available =
                                        isDateAvailable(dateKey);

                                    const isToday =
                                        dateKey === todayKey;

                                    const isSelected =
                                        dateKey === selectedDate;

                                    return (
                                        <button
                                            key={dateKey}
                                            type="button"
                                            disabled={!available}
                                            onClick={() =>
                                                handleDateSelect(dateKey)
                                            }
                                            aria-label={formatDate(dateKey)}
                                            aria-pressed={isSelected}
                                            className={`mx-auto flex aspect-square w-full max-w-12 cursor-pointer items-center justify-center rounded-full border-2 text-sm font-semibold transition ${isSelected
                                                ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                                : isToday
                                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                                    : available
                                                        ? "border-transparent text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                                                        : "cursor-not-allowed border-transparent text-slate-300"
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* CALENDAR LEGEND */}
                            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4">
                                <span className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="h-3 w-3 rounded-full border-2 border-blue-500" />
                                    Hari ini
                                </span>

                                <span className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="h-3 w-3 rounded-full bg-blue-600" />
                                    Dipilih
                                </span>

                                <span className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="h-3 w-3 rounded-full bg-slate-200" />
                                    Tidak tersedia
                                </span>
                            </div>
                        </section>

                        {/* SELECTED DATE */}
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-blue-50 px-4 py-4">
                            <span className="flex items-center gap-2 text-sm text-slate-600">
                                <CalendarDays
                                    size={17}
                                    className="text-blue-600"
                                />
                                Rencana kunjungan
                            </span>

                            <span className="text-right text-sm font-semibold text-blue-800">
                                {selectedDate
                                    ? formatDate(selectedDate)
                                    : "Belum dipilih"}
                            </span>
                        </div>

                        {/* STATIC TIME SLOTS */}
                        <section className={cardClass}>
                            <div className="mb-4 flex items-center gap-3">
                                <Clock3
                                    size={21}
                                    className="text-blue-600"
                                />

                                <div>
                                    <h2 className="font-semibold text-slate-900">
                                        Pilih Jam Kunjungan
                                    </h2>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Waktu kunjungan menggunakan WIB.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {TIME_SLOTS.map((slot) => {
                                    const available =
                                        Boolean(selectedDate) &&
                                        isSlotAvailable(
                                            selectedDate,
                                            slot,
                                        );

                                    const selected =
                                        selectedTime === slot;

                                    return (
                                        <button
                                            key={slot}
                                            type="button"
                                            disabled={!available}
                                            onClick={() => {
                                                setSelectedTime(slot);
                                                setError("");
                                            }}
                                            aria-pressed={selected}
                                            className={`min-h-12 rounded-xl border-2 px-2 py-3 text-sm font-bold transition ${selected
                                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                                : available
                                                    ? "cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                                                    : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                                                }`}
                                        >
                                            {slot}
                                        </button>
                                    );
                                })}
                            </div>

                            {!selectedDate && (
                                <p className="mt-3 text-xs text-slate-500">
                                    Pilih tanggal terlebih dahulu untuk
                                    menentukan jam kunjungan.
                                </p>
                            )}
                        </section>

                        {/* INFORMATION */}
                        <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4">
                            <Info
                                size={18}
                                className="mt-0.5 shrink-0 text-blue-600"
                            />

                            <p className="text-xs leading-relaxed text-blue-800">
                                Tanggal dan jam ini merupakan rencana
                                kunjungan, bukan reservasi slot yang
                                dikonfirmasi secara real-time.
                                Pelayanan mengikuti jam operasional
                                klinik dan ketentuan Health Pass.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={!isScheduleValid || !canBook}
                            className={primaryButton}
                        >
                            Lanjut ke Data Pasien
                            <ChevronRight size={18} />
                        </button>
                    </form>
                )}

                {step === "PATIENT" && (
                    <form
                        onSubmit={handlePatientSubmit}
                        className="space-y-5"
                    >
                        <section className={`${cardClass} space-y-5`}>
                            {/* VERIFIED EMAIL */}
                            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
                                <CheckCircle2
                                    size={20}
                                    className="shrink-0 text-emerald-600"
                                />

                                <div className="min-w-0">
                                    <p className="break-all text-sm font-semibold text-slate-800">
                                        {customer.email_customer}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Email akun customer
                                    </p>
                                </div>
                            </div>

                            {/* RECIPIENT */}
                            <div>
                                <p className={labelClass}>
                                    Untuk siapa layanan ini?
                                </p>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRecipient("SELF");
                                            setError("");
                                        }}
                                        className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition ${recipient === "SELF"
                                            ? "border-blue-600 bg-blue-50 text-blue-700"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                                            }`}
                                    >
                                        <UserRound size={17} />
                                        Saya sendiri
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRecipient("GUEST");
                                            setError("");
                                        }}
                                        className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition ${recipient === "GUEST"
                                            ? "border-blue-600 bg-blue-50 text-blue-700"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                                            }`}
                                    >
                                        <Users size={17} />
                                        Orang lain
                                    </button>
                                </div>
                            </div>

                            {/* SELF */}
                            {recipient === "SELF" && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label className={labelClass}>
                                            Nama Lengkap
                                        </label>

                                        <input
                                            value={customer.name_customer || ""}
                                            readOnly
                                            className={`${inputClass} bg-slate-50`}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}>
                                            Tanggal Lahir
                                        </label>

                                        <input
                                            value={formatBirthDate(
                                                customer.dob_customer,
                                            )}
                                            readOnly
                                            className={`${inputClass} bg-slate-50`}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}>
                                            Jenis Kelamin
                                        </label>

                                        <input
                                            value={formatGender(
                                                customer.gender_customer,
                                            )}
                                            readOnly
                                            className={`${inputClass} bg-slate-50`}
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className={labelClass}>
                                            Nomor HP
                                        </label>

                                        <input
                                            value={
                                                customer.phone_number_customer || "-"
                                            }
                                            readOnly
                                            className={`${inputClass} bg-slate-50`}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* GUEST */}
                            {recipient === "GUEST" && (
                                <div className="space-y-4">
                                    {/* MODE SELECTOR */}
                                    {guests.length > 0 && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setGuestMode("SAVED");
                                                    setError("");
                                                }}
                                                className={`rounded-xl border-2 px-3 py-3 text-sm font-semibold transition ${guestMode === "SAVED"
                                                    ? "border-blue-600 bg-blue-50 text-blue-700"
                                                    : "cursor-pointer border-slate-200 text-slate-600"
                                                    }`}
                                            >
                                                Guest Tersimpan
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setGuestMode("NEW");
                                                    setError("");
                                                }}
                                                className={`rounded-xl border-2 px-3 py-3 text-sm font-semibold transition ${guestMode === "NEW"
                                                    ? "border-blue-600 bg-blue-50 text-blue-700"
                                                    : "cursor-pointer border-slate-200 text-slate-600"
                                                    }`}
                                            >
                                                Guest Baru
                                            </button>
                                        </div>
                                    )}

                                    {/* SELECT SAVED GUEST */}
                                    {guestMode === "SAVED" &&
                                        guests.length > 0 && (
                                            <div>
                                                <label className={labelClass}>
                                                    Pilih Guest
                                                </label>

                                                <select
                                                    value={selectedGuestId}
                                                    onChange={(e) => {
                                                        setSelectedGuestId(
                                                            e.target.value,
                                                        );
                                                        setError("");
                                                    }}
                                                    className={inputClass}
                                                >
                                                    {guests.map((guest) => (
                                                        <option
                                                            key={guest.id_guest}
                                                            value={guest.id_guest}
                                                        >
                                                            {guest.name_guest} —{" "}
                                                            {guest.email_guest}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                    {/* GUEST FORM */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="sm:col-span-2">
                                            <label className={labelClass}>
                                                Nama Lengkap
                                            </label>

                                            <input
                                                required
                                                value={guestPreview.name_guest}
                                                readOnly={
                                                    guestMode === "SAVED" &&
                                                    Boolean(selectedGuest)
                                                }
                                                onChange={(e) =>
                                                    setGuestForm((prev) => ({
                                                        ...prev,
                                                        name_guest: e.target.value,
                                                    }))
                                                }
                                                placeholder="Nama sesuai identitas"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className={labelClass}>
                                                Email Pasien
                                            </label>

                                            <input
                                                required
                                                type="email"
                                                value={guestPreview.email_guest}
                                                readOnly={
                                                    guestMode === "SAVED" &&
                                                    Boolean(selectedGuest)
                                                }
                                                onChange={(e) =>
                                                    setGuestForm((prev) => ({
                                                        ...prev,
                                                        email_guest: e.target.value,
                                                    }))
                                                }
                                                placeholder="pasien@email.com"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Jenis Kelamin
                                            </label>

                                            <select
                                                required
                                                value={guestPreview.gender_guest}
                                                disabled={
                                                    guestMode === "SAVED" &&
                                                    Boolean(selectedGuest)
                                                }
                                                onChange={(e) =>
                                                    setGuestForm((prev) => ({
                                                        ...prev,
                                                        gender_guest: e.target.value,
                                                    }))
                                                }
                                                className={inputClass}
                                            >
                                                <option value="">
                                                    Pilih jenis kelamin
                                                </option>

                                                <option value="MALE">
                                                    Laki-laki
                                                </option>

                                                <option value="FEMALE">
                                                    Perempuan
                                                </option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Nomor HP (Opsional)
                                            </label>

                                            <input
                                                type="tel"
                                                value={
                                                    guestPreview.phone_number_guest
                                                }
                                                readOnly={
                                                    guestMode === "SAVED" &&
                                                    Boolean(selectedGuest)
                                                }
                                                onChange={(e) =>
                                                    setGuestForm((prev) => ({
                                                        ...prev,
                                                        phone_number_guest:
                                                            e.target.value,
                                                    }))
                                                }
                                                placeholder="08xxxxxxxxxx"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>

                                    {/* DUPLICATE EMAIL */}
                                    {existingGuestByEmail && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                            Email tersebut sudah tersimpan
                                            sebagai guest. Silakan pilih dari
                                            daftar guest yang tersedia.

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setGuestMode("SAVED");
                                                    setSelectedGuestId(
                                                        String(
                                                            existingGuestByEmail.id_guest,
                                                        ),
                                                    );
                                                    setError("");
                                                }}
                                                className="mt-2 block cursor-pointer font-bold text-blue-600 underline"
                                            >
                                                Gunakan guest tersimpan
                                            </button>
                                        </div>
                                    )}

                                    {/* GUEST NOTE */}
                                    <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4">
                                        <Mail
                                            size={18}
                                            className="mt-0.5 shrink-0 text-blue-600"
                                        />

                                        <p className="text-xs leading-relaxed text-blue-800">
                                            Health Pass nantinya akan dikirim
                                            ke email penerima layanan setelah
                                            pembayaran berhasil. Data guest
                                            baru belum akan disimpan selama
                                            pembayaran masih dinonaktifkan.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* CONSENT */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-start gap-3">
                                    {/* CHECKBOX - UNCHECKED BY DEFAULT */}
                                    <input
                                        id="customer-user-consent"
                                        type="checkbox"
                                        checked={consent}
                                        onChange={(event) => {
                                            setConsent(event.target.checked);
                                            setError("");
                                        }}
                                        required
                                        aria-describedby="customer-user-consent-description"
                                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
                                    />

                                    {/* CONSENT TEXT & DOCUMENT LINK */}
                                    <div className="min-w-0 flex-1">
                                        <label
                                            htmlFor="customer-user-consent"
                                            id="customer-user-consent-description"
                                            className="cursor-pointer text-xs leading-relaxed text-slate-600"
                                        >
                                            Saya telah membaca dan memahami informasi
                                            pemrosesan Data Pribadi serta menyetujui
                                            pemrosesan Data Pribadi saya untuk keperluan
                                            Verifikasi Identitas dan penyelenggaraan
                                            layanan STIQR Health sesuai dengan Ketentuan
                                            yang berlaku.
                                        </label>

                                        <div className="mt-2">
                                            <Link
                                                to="/customer/user-consent"
                                                state={{ from: location.pathname }}
                                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 underline underline-offset-2 transition hover:text-blue-700"
                                            >
                                                <ShieldCheck size={14} />
                                                Baca Persetujuan Pemrosesan Data Pribadi
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* NEXT BUTTON */}
                        <button
                            type="submit"
                            className={primaryButton}
                        >
                            Lanjut ke Pembayaran
                            <ChevronRight size={18} />
                        </button>
                    </form>
                )}

                {step === "PAYMENT" && (
                    <div className="space-y-5">
                        {/* ORDER SUMMARY */}
                        <section className={cardClass}>
                            <h2 className="mb-5 text-sm font-bold text-blue-700">
                                Ringkasan Pesanan
                            </h2>

                            <h3 className="text-lg font-bold text-slate-900">
                                {service.name_service}
                            </h3>

                            {service.name_provider && (
                                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                    <Building2 size={15} />
                                    {service.name_provider}
                                </p>
                            )}

                            <div className="mt-6 space-y-4 text-sm">
                                {/* PATIENT */}
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-slate-500">
                                        Pasien
                                    </span>

                                    <span className="text-right font-semibold text-slate-800">
                                        {patientName}
                                    </span>
                                </div>

                                {/* EMAIL */}
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-slate-500">
                                        Dikirim ke
                                    </span>

                                    <span className="max-w-[65%] break-all text-right font-semibold text-slate-800">
                                        {patientEmail}
                                    </span>
                                </div>

                                {/* DATE */}
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-slate-500">
                                        Rencana kunjungan
                                    </span>

                                    <span className="text-right font-semibold text-slate-800">
                                        {formatDate(selectedDate)}
                                    </span>
                                </div>

                                {/* TIME */}
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-slate-500">
                                        Jam kunjungan
                                    </span>

                                    <span className="text-right font-semibold text-slate-800">
                                        {selectedTime} WIB
                                    </span>
                                </div>

                                {/* VALIDITY INFO */}
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-slate-500">
                                        Masa berlaku
                                    </span>

                                    <span className="text-right font-medium text-slate-600">
                                        Mengikuti ketentuan Health Pass
                                    </span>
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <div className="flex justify-between gap-4">
                                        <span className="text-slate-500">
                                            Harga layanan
                                        </span>

                                        <span className="font-semibold text-slate-800">
                                            {formatCurrency(
                                                service.price_service,
                                            )}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex justify-between gap-4">
                                        <span className="text-slate-500">
                                            Biaya tambahan
                                        </span>

                                        <span className="font-semibold text-slate-500">
                                            Belum tersedia
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
                                    <span className="text-base font-bold text-slate-900">
                                        Total sementara
                                    </span>

                                    <span className="text-xl font-bold text-blue-700">
                                        {formatCurrency(totalPrice)}
                                    </span>
                                </div>
                            </div>
                        </section>

                        {/* PAYMENT METHODS */}
                        <section className={cardClass}>
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <h2 className="text-base font-bold text-slate-900">
                                    Metode Pembayaran
                                </h2>

                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                    Segera Hadir
                                </span>
                            </div>

                            <div className="space-y-3">
                                {/* DANA */}
                                <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-70">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                        <Wallet size={22} />
                                    </div>

                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-800">
                                            DANA
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                            Pembayaran melalui DANA
                                        </p>
                                    </div>

                                    <LockKeyhole
                                        size={17}
                                        className="text-slate-400"
                                    />
                                </div>

                                {/* NOBU VA */}
                                <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-70">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                        <CreditCard size={22} />
                                    </div>

                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-800">
                                            NOBU Virtual Account
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                            Pembayaran melalui Virtual Account
                                        </p>
                                    </div>

                                    <LockKeyhole
                                        size={17}
                                        className="text-slate-400"
                                    />
                                </div>

                                {/* NOBU QRIS */}
                                <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-70">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                        <QrCode size={22} />
                                    </div>

                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-800">
                                            NOBU QRIS
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                            Pembayaran melalui QRIS
                                        </p>
                                    </div>

                                    <LockKeyhole
                                        size={17}
                                        className="text-slate-400"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* INFORMATION */}
                        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <ShieldCheck
                                size={20}
                                className="mt-0.5 shrink-0 text-blue-600"
                            />

                            <p className="text-xs leading-relaxed text-blue-800">
                                Health Pass akan diterbitkan setelah
                                pembayaran berhasil. Untuk saat ini,
                                pembayaran melalui DANA, NOBU Virtual
                                Account, dan NOBU QRIS belum tersedia
                                pada website.
                            </p>
                        </div>

                        {/* DISABLED PAYMENT BUTTON */}
                        <button
                            type="button"
                            disabled
                            className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-300 px-5 py-3 text-sm font-bold text-white"
                        >
                            <LockKeyhole size={18} />
                            Pembayaran Belum Tersedia
                        </button>

                        <p className="text-center text-xs text-slate-500">
                            Pesanan belum dibuat dan belum ada
                            transaksi pembayaran.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Booking;
