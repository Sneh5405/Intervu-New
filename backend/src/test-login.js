async function testLogin() {
    console.log("Testing Login Endpoint...");
    try {
        // 1. Test with invalid credentials
        console.log("1. Testing Invalid Credentials...");
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: "wrong@example.com",
                password: "wrongpassword"
            })
        });

        if (response.status === 401) {
            console.log("SUCCESS: Correctly rejected invalid credentials (401).");
        } else {
            console.error(`FAILED: Expected 401, got ${response.status}`);
            const text = await response.text();
            console.error("Response:", text);
        }

    } catch (err) {
        console.error("Test execution failed:", err.message);
        if (err.cause) console.error(err.cause);
    }
}

testLogin();
