
import {
    useCallback,
    useEffect,
    useState,
    type ChangeEvent,
    type Dispatch,
    type FormEvent,
    type SetStateAction,
} from "react";

import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";

import type { ProviderFormData } from "../../pages/providers/SignUp";

import Toast, { type ToastData } from "../Toast";
import { useNavigate } from "react-router-dom";

interface Props {
    data: ProviderFormData;
    setData: Dispatch<SetStateAction<ProviderFormData>>;
    onNext: () => void;
}

interface ProviderCategory {
    id_provider_category: number;
    name_provider_category: string;
    description_provider_category: string | null;
    status_provider_category: string;
}

interface ProviderCategoryResponse {
    success: boolean;
    data: ProviderCategory[];
    message?: string;
}

const API_URI = import.meta.env.VITE_API_URI;

const ProviderInformation = ({ data, setData, onNext }: Props) => {
    const [categories, setCategories] = useState<ProviderCategory[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [categoryError, setCategoryError] = useState<string | null>(null);

    const [toast, setToast] = useState<ToastData>({
        show: false,
        type: "error",
        message: "",
    });

    const navigate = useNavigate();

    const closeToast = useCallback(() => {
        setToast((prev) => ({
            ...prev,
            show: false,
        }));
    }, []);

    const showError = useCallback((message: string, title = "Incomplete Information") => {
        setToast({
            show: true,
            type: "error",
            title,
            message,
        });
    }, []);

    // Fetch active provider categories
    const fetchProviderCategories = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoadingCategories(true);
            setCategoryError(null);

            if (!API_URI) {
                throw new Error("VITE_API_URI is not configured.");
            }

            const response = await fetch(
                `${API_URI.replace(/\/$/, "")}/provider-categories/active`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                    },
                    signal,
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to load provider categories (${response.status}).`
                );
            }

            const result: ProviderCategoryResponse = await response.json();

            if (!result.success || !Array.isArray(result.data)) {
                throw new Error(
                    result.message || "Invalid provider categories response."
                );
            }

            const activeCategories = result.data.filter(
                (category) =>
                    category.status_provider_category === "ACTIVE" &&
                    Number.isInteger(category.id_provider_category) &&
                    category.id_provider_category > 0
            );

            if (!signal?.aborted) {
                setCategories(activeCategories);
            }
        } catch (error) {
            if (signal?.aborted) return;

            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to load provider categories.";

            setCategoryError(message);
            setCategories([]);
        } finally {
            if (!signal?.aborted) {
                setLoadingCategories(false);
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        void fetchProviderCategories(controller.signal);

        return () => {
            controller.abort();
        };
    }, [fetchProviderCategories]);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;

        setData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const requiredFields = [
            { value: data.name_provider, label: "Provider Name" },
            { value: data.email_provider, label: "Email" },
            { value: data.phone_number_provider, label: "Phone Number" },
            { value: data.address_provider, label: "Address" },
            { value: data.province_provider, label: "Province" },
            { value: data.city_provider, label: "City" },
            { value: data.district_provider, label: "District" },
            { value: data.postal_code_provider, label: "Postal Code" },
            { value: data.id_provider_category, label: "Provider Category" },
        ];

        const missing = requiredFields.filter(
            (field) => !field.value.trim()
        );

        if (missing.length > 0) {
            showError(
                `Please complete: ${missing.map((field) => field.label).join(", ")}.`
            );
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(data.email_provider.trim())) {
            showError("Please enter a valid email address.", "Invalid Email");
            return;
        }

        if (loadingCategories || categoryError) {
            showError(
                "Provider categories are not ready. Please try again.",
                "Category Unavailable"
            );
            return;
        }

        const selectedCategory = categories.find(
            (category) =>
                String(category.id_provider_category) ===
                data.id_provider_category
        );

        if (!selectedCategory) {
            showError(
                "Please select a valid and active provider category.",
                "Invalid Category"
            );
            return;
        }

        onNext();
    };

    const inputClass =
        "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100";

    const labelClass = "mb-2 block text-sm font-medium text-gray-700";

    return (
        <>
            <Toast toast={toast} onClose={closeToast} />

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Provider Information
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                        Tell us about your healthcare provider. You'll upload
                        the required legal documents in the next step.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    {/* PROVIDER NAME */}
                    <div>
                        <label htmlFor="name_provider" className={labelClass}>
                            Provider Name <span className="text-red-500">*</span>
                        </label>

                        <input
                            id="name_provider"
                            name="name_provider"
                            value={data.name_provider}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Provider name"
                        />
                    </div>

                    {/* EMAIL & PHONE */}
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label htmlFor="email_provider" className={labelClass}>
                                Email <span className="text-red-500">*</span>
                            </label>

                            <input
                                id="email_provider"
                                type="email"
                                name="email_provider"
                                value={data.email_provider}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="provider@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="phone_number_provider" className={labelClass}>
                                Phone Number <span className="text-red-500">*</span>
                            </label>

                            <input
                                id="phone_number_provider"
                                type="tel"
                                name="phone_number_provider"
                                value={data.phone_number_provider}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="08xxxxxxxxxx"
                            />
                        </div>
                    </div>

                    {/* ADDRESS */}
                    <div>
                        <label htmlFor="address_provider" className={labelClass}>
                            Address <span className="text-red-500">*</span>
                        </label>

                        <textarea
                            id="address_provider"
                            name="address_provider"
                            value={data.address_provider}
                            onChange={handleChange}
                            className={`${inputClass} min-h-24 resize-none`}
                            placeholder="Provider address"
                        />
                    </div>

                    {/* LOCATION */}
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label htmlFor="province_provider" className={labelClass}>
                                Province <span className="text-red-500">*</span>
                            </label>

                            <input
                                id="province_provider"
                                name="province_provider"
                                value={data.province_provider}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="Province"
                            />
                        </div>

                        <div>
                            <label htmlFor="city_provider" className={labelClass}>
                                City <span className="text-red-500">*</span>
                            </label>

                            <input
                                id="city_provider"
                                name="city_provider"
                                value={data.city_provider}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="City"
                            />
                        </div>

                        <div>
                            <label htmlFor="district_provider" className={labelClass}>
                                District <span className="text-red-500">*</span>
                            </label>

                            <input
                                id="district_provider"
                                name="district_provider"
                                value={data.district_provider}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="District"
                            />
                        </div>

                        <div>
                            <label htmlFor="postal_code_provider" className={labelClass}>
                                Postal Code <span className="text-red-500">*</span>
                            </label>

                            <input
                                id="postal_code_provider"
                                name="postal_code_provider"
                                value={data.postal_code_provider}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="Postal code"
                            />
                        </div>
                    </div>

                    {/* PROVIDER CATEGORY */}
                    <div>
                        <label htmlFor="id_provider_category" className={labelClass}>
                            Provider Category <span className="text-red-500">*</span>
                        </label>

                        <div className="relative">
                            <select
                                id="id_provider_category"
                                name="id_provider_category"
                                value={data.id_provider_category}
                                onChange={handleChange}
                                disabled={loadingCategories || categories.length === 0}
                                className={`${inputClass} cursor-pointer disabled:cursor-not-allowed`}
                            >
                                <option value="">
                                    {loadingCategories
                                        ? "Loading provider categories..."
                                        : categories.length === 0
                                            ? "No categories available"
                                            : "Select Provider Category"}
                                </option>

                                {categories.map((category) => (
                                    <option
                                        key={category.id_provider_category}
                                        value={String(category.id_provider_category)}
                                    >
                                        {category.name_provider_category}
                                    </option>
                                ))}
                            </select>

                            {loadingCategories && (
                                <Loader2
                                    size={17}
                                    className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 animate-spin text-blue-600"
                                />
                            )}
                        </div>

                        {categoryError && (
                            <div className="mt-2 flex items-center justify-between gap-3">
                                <p className="text-xs text-red-500">
                                    {categoryError}
                                </p>

                                <button
                                    type="button"
                                    onClick={() => void fetchProviderCategories()}
                                    disabled={loadingCategories}
                                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                                >
                                    <RefreshCw size={13} />
                                    Retry
                                </button>
                            </div>
                        )}

                        {!categoryError &&
                            !loadingCategories &&
                            categories.length > 0 && (
                                <p className="mt-2 text-xs text-gray-400">
                                    Select the category that best describes your
                                    healthcare provider.
                                </p>
                            )}

                        {!categoryError &&
                            !loadingCategories &&
                            categories.length === 0 && (
                                <p className="mt-2 text-xs text-amber-600">
                                    There are currently no active provider categories.
                                </p>
                            )}
                    </div>

                    {/* DESCRIPTION */}
                    <div>
                        <label htmlFor="description_provider" className={labelClass}>
                            Description
                        </label>

                        <textarea
                            id="description_provider"
                            name="description_provider"
                            value={data.description_provider}
                            onChange={handleChange}
                            className={`${inputClass} min-h-28 resize-none`}
                            placeholder="Describe your provider"
                        />
                    </div>

                    {/* SUBMIT */}

                    {/* ACTION BUTTONS */}
                    <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-between">
                        {/* BACK TO SIGN IN */}
                        <button
                            type="button"
                            onClick={() => navigate("/provider/sign-in")}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-gray-900"
                        >
                            <ArrowLeft size={17} />
                            Back to Sign In
                        </button>

                        {/* CONTINUE TO DOCUMENTS */}
                        <button
                            type="submit"
                            disabled={
                                loadingCategories ||
                                !!categoryError ||
                                categories.length === 0
                            }
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                        >
                            {loadingCategories && (
                                <Loader2 size={16} className="animate-spin" />
                            )}

                            Continue to Documents
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default ProviderInformation;
