async function createTestUser() {
    const EMAIL = "testuser@intervue.com";
    const PASSWORD = "password123";

    console.log("Creating Test User:", EMAIL);

    const signupRes = await fetch('http://localhost:3000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "Browser Test User", email: EMAIL, password: PASSWORD, role: "INTERVIEWEE" })
    });

    const data = await signupRes.json();
    console.log("Signup Response:", signupRes.status, data);
}

createTestUser();
