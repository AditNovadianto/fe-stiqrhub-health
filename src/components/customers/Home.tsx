import { useEffect } from "react";
import { isTokenExpired } from "../../utils/auth";
import { useNavigate } from "react-router-dom";

const Home = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const token = sessionStorage.getItem("customer_token");

        if (isTokenExpired(String(token))) {
            sessionStorage.removeItem("customer_token");
            localStorage.removeItem("customer_data");

            navigate("/customer/sign-in");
        }
    }, []);
    return (
        <div>Home Customer</div>
    )
}

export default Home