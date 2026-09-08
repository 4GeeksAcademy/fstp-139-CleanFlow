import { useState } from "react";

export const Register = () => {


    const [formData, setFormData] = useState({
        name: "",
        last_name: "",
        email: "",
        phone: "",
        password: ""
    });

    const handleChange = (event) => {
        setFormData({
            ...formData,
            [event.target.name]: event.target.value
        });
    };
    
    const handleSubmit = async (event) => {
    event.preventDefault();

    const response = await fetch(
    `${import.meta.env.VITE_BACKEND_URL}/api/register`,
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
    }
);
    const data = await response.json();
    console.log(data);

};
    return (
      
            <div>
                <h1>Create account</h1>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        name="name"
                        placeholder="Name"
                        value={formData.name}
                        onChange={handleChange}
                    />

                    <input
                        type="text"
                        name="last_name"
                        placeholder="Last name"
                        value={formData.last_name}
                        onChange={handleChange}
                    />

                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                    />

                    <input
                        type="tel"
                        name="phone"
                        placeholder="Phone"
                        value={formData.phone}
                        onChange={handleChange}
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                    />

                    <button type="submit">Register</button>
                </form>
            </div>

            );
        };