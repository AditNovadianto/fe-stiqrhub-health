import { useEffect } from "react";
import {
    CheckCircle2,
    CircleAlert,
    X,
} from "lucide-react";

export type ToastType = "success" | "error";

export interface ToastData {
    show: boolean;
    type: ToastType;
    title?: string;
    message: string;
}

interface Props {
    toast: ToastData;
    onClose: () => void;
    duration?: number;
}

const Toast = ({
    toast,
    onClose,
    duration = 4000,
}: Props) => {
    useEffect(() => {
        if (!toast.show) return;

        const timeout = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timeout);
    }, [toast.show, duration, onClose]);

    if (!toast.show) return null;

    const isSuccess =
        toast.type === "success";

    return (
        <div className="fixed right-5 top-5 z-100 w-[calc(100%-2.5rem)] max-w-sm">
            <div
                className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg ${isSuccess
                    ? "border-green-200"
                    : "border-red-200"
                    }`}
            >
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isSuccess
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                        }`}
                >
                    {isSuccess ? (
                        <CheckCircle2 size={19} />
                    ) : (
                        <CircleAlert size={19} />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                        {toast.title ??
                            (isSuccess
                                ? "Success"
                                : "Something went wrong")}
                    </p>

                    <p className="mt-1 text-sm leading-5 text-gray-500">
                        {toast.message}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer text-gray-400 transition hover:text-gray-600"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

export default Toast;