function showAuthError(msg) {
  const errEl = document.getElementById("auth-error");
  if (errEl) {
    errEl.innerText = msg;
    errEl.classList.add("visible");
  } else {
    alert(msg);
  }
}

function loginUser(email, password) {
  const btn = document.getElementById("login-btn");
  if (btn) btn.innerText = "Signing in...";

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
          const userData = doc.data();
          localStorage.setItem("user", JSON.stringify(user));
          
          if (userData.role === 'admin') {
            window.location.href = "admin-dashboard.html";
          } else if (userData.role === 'mentor') {
            window.location.href = "mentor-dashboard.html";
          } else {
            window.location.href = "member-dashboard.html";
          }
        } else {
          showAuthError("User profile not found. Please contact admin.");
          firebase.auth().signOut();
          if (btn) btn.innerText = "Sign In";
        }
      } catch (err) {
        showAuthError("Error fetching user role.");
        firebase.auth().signOut();
        if (btn) btn.innerText = "Sign In";
      }
    })
    .catch((error) => {
      if (btn) btn.innerText = "Sign In";
      showAuthError("Login failed: " + error.message);
    });
}

function signupMember(name, email, password, phone) {
  const btn = document.getElementById("signup-btn");
  if (btn) btn.innerText = "Creating Account...";
  
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      try {
        await db.collection('users').doc(user.uid).set({
          name: name,
          email: email,
          phone: phone,
          role: "member",
          membershipStatus: "inactive",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Also create an empty members doc (this was existing logic)
        await db.collection('members').doc(user.uid).set({
          joinDate: firebase.firestore.FieldValue.serverTimestamp(),
          status: 'inactive'
        });

        localStorage.setItem("user", JSON.stringify(user));
        window.location.href = "member-dashboard.html";
      } catch (err) {
        showAuthError("Error creating user profile.");
        firebase.auth().signOut();
        if (btn) btn.innerText = "Create Account";
      }
    })
    .catch((error) => {
      if (btn) btn.innerText = "Create Account";
      showAuthError("Registration failed: " + error.message);
    });
}