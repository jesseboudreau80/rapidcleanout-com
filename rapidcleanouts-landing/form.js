const form = document.getElementById('estimate-form');
const statusEl = document.getElementById('form-status');

const setStatus = (message, isError = false) => {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b91c1c' : '#065f46';
};

const isValidPhone = (value) => /[0-9]{7,}/.test(value.replace(/\D/g, ''));

const validate = (formData) => {
  const firstName = (formData.get('firstName') || '').toString().trim();
  const lastName = (formData.get('lastName') || '').toString().trim();
  const phone = (formData.get('phone') || '').toString().trim();
  const honeypot = (formData.get('website') || '').toString().trim();
  const smsConsent = (formData.get('smsConsent') || '').toString().trim();
  const photo = formData.get('photo');

  if (honeypot) {
    return 'Unable to process submission.';
  }
  if (!firstName) {
    return 'Please enter your first name.';
  }
  if (!lastName) {
    return 'Please enter your last name.';
  }
  if (!phone || !isValidPhone(phone)) {
    return 'Please enter a valid phone number.';
  }
  if (!smsConsent) {
    return 'Please confirm SMS consent to continue.';
  }
  if (!photo || !(photo instanceof File) || photo.size === 0) {
    return 'Please upload a project photo.';
  }

  return null;
};

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Sending your request...');

  const formData = new FormData(form);
  const validationError = validate(formData);
  if (validationError) {
    setStatus(validationError, true);
    return;
  }

  try {
    const response = await fetch('/api/lead', {
      method: 'POST',
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Submission failed.');
    }

    setStatus('Thanks! Your estimate request has been received.');
    form.reset();
  } catch (error) {
    setStatus(error.message || 'Could not send your request. Please try again.', true);
  }
});
