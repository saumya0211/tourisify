/* eslint-disable */
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51NpAGySFayyNmojEukOGn2hvkGVtVP52B0BUVUrYEk3eyejb5Lpf8rg2jcEvdVYaI8QLSqFLNMa6AnWwoqmCZrAC00kVKBTRTZ',
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    // 2) Create checkout form + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
