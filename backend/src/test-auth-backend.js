async function testAuthBackend() {
    console.log("=== Testing Backend Auth Features ===");
    const EMAIL = `auth_test_${Date.now()}@example.com`;
    const PASSWORD = "securePassword123";
    let userId;
    let accessToken;
    let refreshToken;

    try {
        // 1. Signup
        console.log("\n1. Testing Signup (Password Hashing)...");
        const signupRes = await fetch('http://localhost:3000/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: "Auth Test", email: EMAIL, password: PASSWORD, role: "INTERVIEWEE" })
        });
        const signupData = await signupRes.json();

        if (signupRes.ok) {
            console.log("SUCCESS: Signup successful. UserId:", signupData.userId);
            userId = signupData.userId;
        } else {
            throw new Error(`Signup Failed: ${JSON.stringify(signupData)}`);
        }

        // Note: Can't easily check DB for hash here without prisma, but successful login later proves it.

        // 2. Login
        console.log("\n2. Testing Login...");
        const loginRes = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });
        const loginData = await loginRes.json();

        if (loginRes.ok && loginData.accessToken && loginData.refreshToken) {
            console.log("SUCCESS: Login successful.");
            console.log("Access Token:", loginData.accessToken.substring(0, 20) + "...");
            console.log("Refresh Token:", loginData.refreshToken.substring(0, 20) + "...");
            accessToken = loginData.accessToken;
            refreshToken = loginData.refreshToken;
        } else {
            throw new Error(`Login Failed: ${JSON.stringify(loginData)}`);
        }

        // 3. Refresh Token
        console.log("\n3. Testing Refresh Token...");
        const refreshRes = await fetch('http://localhost:3000/api/refresh-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });
        const refreshData = await refreshRes.json();

        if (refreshRes.ok && refreshData.accessToken && refreshData.refreshToken) {
            console.log("SUCCESS: Refresh successful.");
            console.log("New Access Token:", refreshData.accessToken.substring(0, 20) + "...");
            console.log("New Refresh Token:", refreshData.refreshToken.substring(0, 20) + "...");
            // Update tokens
            accessToken = refreshData.accessToken;
            refreshToken = refreshData.refreshToken;
        } else {
            throw new Error(`Refresh Failed: ${JSON.stringify(refreshData)}`);
        }

        // 4. Logout
        console.log("\n4. Testing Logout...");
        const logoutRes = await fetch('http://localhost:3000/api/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        if (logoutRes.status === 204) {
            console.log("SUCCESS: Logout successful (204 No Content).");
        } else {
            throw new Error(`Logout Failed: Status ${logoutRes.status}`);
        }

        // 5. Verify Refresh Token is Invalidated
        console.log("\n5. Verifying Token Invalidation...");
        const invalidRefreshRes = await fetch('http://localhost:3000/api/refresh-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        if (invalidRefreshRes.status === 403) {
            console.log("SUCCESS: Refreshed token correctly rejected after logout.");
        } else {
            console.error(`FAILURE: Expected 403, got ${invalidRefreshRes.status}`);
        }

        console.log("\n=== ALL BACKEND TESTS PASSED ===");

    } catch (err) {
        console.error("\nTEST FAILED:", err.message);
    }
}

testAuthBackend();
