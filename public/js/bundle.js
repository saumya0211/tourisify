(() => {
  // public/js/leaflet.js
  var displayMap = (locations) => {
    var map = L.map("map", { zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    const points = [];
    locations.forEach((loc) => {
      points.push([loc.coordinates[1], loc.coordinates[0]]);
      L.marker([loc.coordinates[1], loc.coordinates[0]]).addTo(map).bindPopup(`<p>Day ${loc.day}: ${loc.description}</p>`, {
        autoClose: false
      }).openPopup();
    });
    const bounds = L.latLngBounds(points).pad(0.27);
    map.fitBounds(bounds);
    map.scrollWheelZoom.disable();
  };

  // public/js/alerts.js
  var hideAlert = () => {
    const el = document.querySelector(".alert");
    if (el)
      el.parentElement.removeChild(el);
  };
  var showAlert = (type, msg) => {
    hideAlert();
    const markup = `<div class="alert alert--${type}">${msg}</div>`;
    document.querySelector("body").insertAdjacentHTML("afterbegin", markup);
    window.setTimeout(hideAlert, 5e3);
  };

  // public/js/login.js
  var login = async (email, password) => {
    try {
      const res = await axios({
        method: "POST",
        url: "/api/v1/users/login",
        data: {
          email,
          password
        }
      });
      if (res.data.status === "success") {
        showAlert("success", "Logged In Successfully !!");
        window.setTimeout(() => {
          location.assign("/");
        });
      }
    } catch (err) {
      showAlert("error", err.response.data.message);
    }
  };
  var logout = async () => {
    try {
      const res = await axios({
        method: "GET",
        url: "/api/v1/users/logout"
      });
      if (res.data.status === "success") {
        location.reload(true);
        window.location = "/";
      }
    } catch (err) {
      showAlert("error", err.response.data.message);
    }
  };
  var signup = async (name, email, password, passwordConfirm) => {
    try {
      const res = await axios({
        method: "POST",
        url: "/api/v1/users/signup",
        data: {
          name,
          email,
          password,
          passwordConfirm
        }
      });
      if (res.data.status === "success") {
        showAlert("success", "SignUp Successfully !!");
        window.setTimeout(() => {
          location.assign("/");
        });
      }
    } catch (err) {
      showAlert("error", err.response.data.message);
    }
  };

  // public/js/updateSettings.js
  var updateSettings = async (data, type) => {
    try {
      const url = type === "password" ? "/api/v1/users/updateMypassword" : "/api/v1/users/updateMe";
      const res = await axios({
        method: "PATCH",
        url,
        data
      });
      if (res.data.status === "success") {
        showAlert("success", `${type} updated successfully !!`);
      }
    } catch (err) {
      showAlert("error", err.response.data.message);
    }
  };

  // public/js/stripe.js
  var stripe = Stripe(
    "pk_test_51NpAGySFayyNmojEukOGn2hvkGVtVP52B0BUVUrYEk3eyejb5Lpf8rg2jcEvdVYaI8QLSqFLNMa6AnWwoqmCZrAC00kVKBTRTZ"
  );
  var bookTour = async (tourId) => {
    try {
      const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
      await stripe.redirectToCheckout({
        sessionId: session.data.session.id
      });
    } catch (err) {
      console.log(err);
      showAlert("error", err);
    }
  };

  // public/js/index.js
  var mapBox = document.getElementById("map");
  var loginForm = document.querySelector(".form--login");
  var signupForm = document.querySelector(".form--signup");
  var logOutBtn = document.querySelector(".nav__el--logout");
  var userDataForm = document.querySelector(".form-user-data");
  var userPasswordForm = document.querySelector(".form-user-password");
  var bookBtn = document.getElementById("book-tour");
  if (mapBox) {
    const locations = JSON.parse(mapBox.dataset.locations);
    displayMap(locations);
  }
  if (loginForm)
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      document.querySelector(".btn--login ").textContent = "Log In...";
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      await login(email, password);
      document.querySelector(".btn--login ").textContent = "LOGIN";
    });
  if (signupForm)
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      document.querySelector(".btn--signup ").textContent = "signup...";
      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const passwordConfirm = document.getElementById("passwordConfirm").value;
      await signup(name, email, password, passwordConfirm);
      document.querySelector(".btn--signup ").textContent = "signed Up";
    });
  if (logOutBtn)
    logOutBtn.addEventListener("click", logout);
  if (userDataForm)
    userDataForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      document.querySelector(".btn--save-settings").textContent = "Saving....";
      const form = new FormData();
      form.append("name", document.getElementById("name").value);
      form.append("email", document.getElementById("email").value);
      form.append("photo", document.getElementById("photo").files[0]);
      await updateSettings(form, "Data");
      document.querySelector(".btn--save-settings").textContent = "SAVE SETTINGS";
      location.reload(true);
    });
  if (userPasswordForm)
    userPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      document.querySelector(".btn--save-password").textContent = "Updating...";
      const passwordCurrent = document.getElementById("password-current").value;
      const password = document.getElementById("password").value;
      const passwordConfirm = document.getElementById("password-confirm").value;
      await updateSettings(
        { passwordCurrent, password, passwordConfirm },
        "password"
      );
      document.querySelector(".btn--save-password").textContent = "Save password";
      document.getElementById("password-current").value = "";
      document.getElementById("password").value = "";
      document.getElementById("password-confirm").value = "";
    });
  if (bookBtn)
    bookBtn.addEventListener("click", (e) => {
      e.target.textContent = "Processing...";
      const { tourId } = e.target.dataset;
      bookTour(tourId);
    });
})();
