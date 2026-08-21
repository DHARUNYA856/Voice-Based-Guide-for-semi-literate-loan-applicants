// Simple interactive script to simulate the voice-guided flow locally.
// Uses prompt() to simulate mic input so the page is usable without Web Speech APIs.

(() => {
  const startButton = document.getElementById('startButton');
  const micButton = document.getElementById('micButton');
  const prevButton = document.getElementById('prevButton');
  const nextButton = document.getElementById('nextButton');
  const assistantToggle = document.getElementById('assistantToggle');
  const voiceHelpButton = document.getElementById('voiceHelpButton');
  const status = document.getElementById('status');
  const progress = document.getElementById('progress-bar');
  const guideOutput = document.getElementById('guide-output');
  const userInput = document.getElementById('user-input');

  const page1 = document.getElementById('page-1-lang');
  const page2 = document.getElementById('page-2-auth');
  const page3 = document.getElementById('page-3-form');

  const authAccountInput = document.getElementById('auth-account-input');
  const authOTPInput = document.getElementById('auth-otp-input');
  const mockOtpText = document.getElementById('mock-otp-text');
  const mockOtpValue = document.getElementById('mock-otp-value');
  const mockAutofill = document.getElementById('mock-otp-autofill');
  const mockResend = document.getElementById('mock-otp-resend');

  const formName = document.getElementById('form-name');
  const formAmount = document.getElementById('form-amount');
  const formPurpose = document.getElementById('form-purpose');
  const dataDisplay = document.getElementById('data-display');

  let currentStep = 0; // 0 = not started, 1 = language, 2 = auth, 3 = form
  let generatedOtp = null;
  let lastGuideText = '';
  let recognition = null;
  let isListening = false;
  let recognitionSupported = false;
  let selectedLanguage = 'English';

  // Local translations for common UI phrases to ensure offline/synchronous TTS
  const LOCAL_TRANSLATIONS = {
    Tamil: {
      'Awaiting language selection...': 'மொழியைத் தேர்ந்தெடுக்க எதிர்பார்க்கப்படுகிறது...',
      'Listening for language. Click "Speak Now" and type your language (English/Hindi/Tamil).': 'மொழியை கேட்கின்றேன். "இப்போது பேசவும்" அழுத்தி உங்கள் மொழியை (ஆங்கிலம்/ஹிந்தி/தமிழ்) தட்டச்சு செய்யவும்.',
      'Now authenticate by providing your 10-digit mobile number.': 'தயவுசெய்து உங்கள் 10 இலக்க மொபைல் எண்ணை வழங்கி அங்கீகரிக்கவும்.',
      'Provide account/mobile number to receive a mock OTP.': 'மோக் OTP பெற உங்கள் கணக்கு/மொபைல் எண்ணை வழங்கவும்.',
      'Fill the loan form via voice (Speak Now) or type into fields.': 'குரலின் மூலம் கடன் படிவத்தை நிரப்பவும் (இப்போது பேசவும்) அல்லது புலங்களில் தட்டச்சு செய்யவும்.',
      'Provide applicant name, loan amount and purpose.': 'விண்ணப்பதாரரின் பெயர், கடன் தொகை மற்றும் நோக்கத்தை வழங்கவும்.',
      'Click "Start Guide" to begin.': 'தொடங்க "Start Guide" ஐ கிளிக் செய்யவும்.',
      'Mock OTP generated. Click "Speak Now" and type the OTP or use Auto-fill.': 'மோக் OTP உருவாக்கப்பட்டது. "இப்போது பேசவும்" அழுத்தி OTP-ஐ தட்டச்சு செய்து அல்லது தானியாக நிரப்பவும்.',
      'OTP verified. Proceeding to loan application form.': 'OTP சரிபார்க்கப்பட்டது. கடன் விண்ணப்பப் படிவத்திற்குச் செல்கிறோம்.',
      'Loan form completed. Preparing final data.': 'கடன் படிவம் நிரம்பியதாக உள்ளது. இறுதி தரவை தயாரிக்கிறது.'
    },
    Hindi: {
      'Awaiting language selection...': 'भाषा चयन की प्रतीक्षा...',
      'Listening for language. Click "Speak Now" and type your language (English/Hindi/Tamil).': 'भाषा सुन रहा है। "Speak Now" पर क्लिक करें और अपनी भाषा (English/Hindi/Tamil) टाइप करें।',
      'Now authenticate by providing your 10-digit mobile number.': 'कृपया अपना 10-अंकीय मोबाइल नंबर देकर प्रमाणीकरण करें।',
      'Provide account/mobile number to receive a mock OTP.': 'मॉक OTP प्राप्त करने के लिए खाता/मोबाइल नंबर प्रदान करें।',
      'Fill the loan form via voice (Speak Now) or type into fields.': 'वॉइस के माध्यम से लोन फॉर्म भरें (Speak Now) या फ़ील्ड में टाइप करें।',
      'Provide applicant name, loan amount and purpose.': 'आवेदक का नाम, ऋण राशि और उद्देश्य दर्ज करें।',
      'Click "Start Guide" to begin.': 'शुरू करने के लिए "Start Guide" पर क्लिक करें।',
      'Mock OTP generated. Click "Speak Now" and type the OTP or use Auto-fill.': 'मॉक OTP जनरेट किया गया है। "Speak Now" दबाकर OTP टाइप करें या Auto-fill का उपयोग करें।',
      'OTP verified. Proceeding to loan application form.': 'OTP सत्यापित। लोन आवेदन फॉर्म पर जा रहे हैं।',
      'Loan form completed. Preparing final data.': 'लोन फॉर्म पूरा हुआ। अंतिम डेटा तैयार कर रहा है।'
    }
  };

  // Initialize SpeechRecognition if available
  try {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognitionSupported = true;
    }
  } catch (e) {
    recognition = null;
    recognitionSupported = false;
  }

  function setProgress(p) {
    progress.style.width = `${p}%`;
  }

  function appendGuide(text) {
    lastGuideText = text;
    guideOutput.textContent = text;
    // If assistant mode is enabled, speak the guide in the selected language.
    try {
      if (assistantToggle && assistantToggle.checked) {
        // Prefer local translation if available to avoid latency and API dependence
        const lang = selectedLanguage || 'English';
        if (lang !== 'English' && LOCAL_TRANSLATIONS[lang]) {
          // Try exact match
          let translated = LOCAL_TRANSLATIONS[lang][text];
          // Handle a few dynamic or templated messages
          if (!translated) {
            const m = text.match(/Language selected:\s*(\w+)/i) || text.match(/Selected\s+(\w+)\./i);
            if (m) {
              const chosen = m[1];
              if (lang === 'Tamil') translated = `மொழி தேர்வானது: ${chosen}. அங்கீகரிப்புக்கு முன்னேறுகிறோம்.`;
              if (lang === 'Hindi') translated = `भाषा चुनी गई: ${chosen}. प्रमाणीकरण की ओर बढ़ रहे हैं.`;
            }
          }
          if (translated) {
            // show English text in UI but speak the translation
            speakAssistant(translated);
          } else {
            // fallback to AI translation if no local translation
            translateAndSpeak(text, lang).catch(err => { console.warn('translateAndSpeak failed', err); speakAssistant(text); });
          }
        } else {
          // English or no local translation available
          speakAssistant(text);
        }
      }
    } catch (e) {
      console.warn('appendGuide speak error', e);
    }
  }

  // Ask the AI to translate a short piece of text into the user's language and speak the reply
  async function translateAndSpeak(text, language) {
    if (!text) return;
    try {
      const payload = { message: `Please translate the following into ${language} and reply only with the translation:\n\n${text}`, language };
      const res = await fetch('http://localhost:3000/api/ai-assist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('AI translate request failed');
      const j = await res.json();
      if (j && j.ok && j.reply) {
        // Speak the translated reply
        speakAssistant(j.reply);
      } else {
        throw new Error('AI returned no translation');
      }
    } catch (e) {
      console.error('translateAndSpeak error', e);
      throw e;
    }
  }

  function appendUser(text) {
    userInput.textContent = text;
  }

  function showPage(step) {
    page1.classList.toggle('hidden-page', step !== 1);
    page2.classList.toggle('hidden-page', step !== 2);
    page3.classList.toggle('hidden-page', step !== 3);
  }

  function goToStep(step) {
    currentStep = step;
    showPage(step);
    if (step === 1) setProgress(33);
    else if (step === 2) setProgress(66);
    else if (step === 3) setProgress(100);
    else setProgress(0);

    micButton.disabled = step === 0;
    prevButton.disabled = step <= 1;
    nextButton.disabled = step >= 3 || step === 0;

    if (step === 1) {
      status.textContent = 'Listening for language. Click "Speak Now" and type your language (English/Hindi/Tamil).';
      appendGuide('Awaiting language selection...');
    } else if (step === 2) {
      status.textContent = 'Now authenticate by providing your 10-digit mobile number.';
      appendGuide('Provide account/mobile number to receive a mock OTP.');
    } else if (step === 3) {
      status.textContent = 'Fill the loan form via voice (Speak Now) or type into fields.';
      appendGuide('Provide applicant name, loan amount and purpose.');
    } else {
      status.textContent = 'Click "Start Guide" to begin language selection.';
      appendGuide('Click "Start Guide" to begin.');
    }
  }

  function nextStep() {
    if (currentStep < 3) {
      // validate current step before advancing
      if (!validateCurrentStep()) return;
      goToStep(currentStep + 1);
    }
  }

  function prevStep() {
    if (currentStep > 1) goToStep(currentStep - 1);
  }

  function startOver() {
    // reset form and auth
    authAccountInput.value = '';
    authOTPInput.value = '';
    formName.value = '';
    formAmount.value = '';
    formPurpose.value = '';
    generatedOtp = null;
    mockOtpText.hidden = true;
    mockAutofill.hidden = true;
    mockResend.hidden = true;
    dataDisplay.textContent = 'No data submitted yet.';
    goToStep(0);
  }

  // Validation rules for steps
  function validateCurrentStep() {
    if (currentStep === 1) {
      // language step has no strict validation
      return true;
    }
    if (currentStep === 2) {
      const acc = authAccountInput.value.replace(/\D/g, '');
      if (acc.length !== 10) {
        appendGuide('Error: Account/mobile number must be 10 digits.');
        status.textContent = 'Please provide a valid 10-digit mobile number.';
        return false;
      }
      if (!authOTPInput.value) {
        appendGuide('Please enter the 4-digit OTP before continuing.');
        status.textContent = 'OTP required.';
        return false;
      }
      if (authOTPInput.value.length !== 4) {
        appendGuide('OTP must be 4 digits.');
        status.textContent = 'Enter correct 4-digit OTP.';
        return false;
      }
      return true;
    }
    if (currentStep === 3) {
      if (!formName.value || formName.value.trim().length < 2) {
        appendGuide('Applicant name is required.');
        status.textContent = 'Provide a valid name.';
        return false;
      }
      const amt = parseFloat(formAmount.value);
      if (!amt || isNaN(amt) || amt <= 0) {
        appendGuide('Loan amount must be a positive number.');
        status.textContent = 'Provide a valid loan amount.';
        return false;
      }
      if (!formPurpose.value || formPurpose.value.trim().length < 3) {
        appendGuide('Loan purpose is required.');
        status.textContent = 'Provide loan purpose.';
        return false;
      }
      return true;
    }
    return true;
  }

  // Compose the final data object
  function collectFinalData() {
    return {
      timestamp: new Date().toISOString(),
      language: guideOutput.textContent.match(/Language selected:\s*(\w+)/i)?.[1] || 'English',
      account: authAccountInput.value,
      otp: authOTPInput.value,
      applicantName: formName.value,
      loanAmount: formAmount.value,
      loanPurpose: formPurpose.value
    };
  }

  // Submit to backend
  const submitButton = document.getElementById('submitButton');
  const downloadPdfButton = document.getElementById('downloadPdfButton');
  const printButton = document.getElementById('printButton');

  async function submitToServer() {
    // Validate final step
    if (!validateCurrentStep()) { goToStep(3); return; }
    const payload = collectFinalData();
    try {
      const res = await fetch('http://localhost:3000/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error: ${res.status} ${text}`);
      }
      const j = await res.json();
      appendGuide('Data submitted to server successfully. ID: ' + (j.id || 'n/a'));
      status.textContent = 'Submitted.';
    } catch (e) {
      console.error('submitToServer error', e);
      appendGuide('Submit failed — saved locally. You can retry when the server is available.');
      status.textContent = 'Submit failed; saved locally.';
      // Save to localStorage pending queue for retry
      try {
        const existing = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
        existing.push({ payload, error: String(e), ts: new Date().toISOString() });
        localStorage.setItem('pendingSubmissions', JSON.stringify(existing));
      } catch (err) {
        console.error('local save failed', err);
      }
    }
  }

  // Request PDF generation and download
  async function downloadPdf() {
    // Validate
    if (!validateCurrentStep()) { goToStep(3); return; }
    const payload = collectFinalData();
    try {
      const res = await fetch('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loan-application-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      appendGuide('PDF downloaded.');
      status.textContent = 'PDF ready.';
    } catch (e) {
      console.warn('Server PDF failed, falling back to client-side PDF', e);
      appendGuide('Server PDF failed. Falling back to client-side PDF generation.');
      status.textContent = 'Generating PDF locally...';
      // Fallback: generate PDF client-side using jsPDF (if loaded)
      try {
        const { jsPDF } = window.jspdf || {};
        if (jsPDF) {
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.text('Loan Application', 105, 20, { align: 'center' });
          doc.setFontSize(11);
          const lines = JSON.stringify(payload, null, 2).split('\n');
          let y = 35;
          lines.forEach(line => {
            doc.text(line, 14, y);
            y += 7;
            if (y > 280) { doc.addPage(); y = 20; }
          });
          doc.save(`loan-application-${Date.now()}.pdf`);
          appendGuide('Local PDF downloaded.');
          status.textContent = 'Local PDF ready.';
        } else {
          appendGuide('jsPDF not available — cannot generate PDF locally.');
          status.textContent = 'PDF failed.';
          console.error('jsPDF missing');
        }
      } catch (err) {
        appendGuide('Client-side PDF generation failed.');
        status.textContent = 'PDF failed.';
        console.error('client pdf error', err);
      }
    }
  }

  // Retry pending submissions stored in localStorage
  async function retryPendingSubmissions() {
    try {
      const pending = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
      if (!pending.length) { appendGuide('No pending submissions'); status.textContent = 'No pending submissions.'; return; }
      appendGuide(`Retrying ${pending.length} pending submissions...`);
      for (const item of pending.slice()) {
        try {
          const res = await fetch('http://localhost:3000/api/submit', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.payload)
          });
          if (res.ok) {
            const j = await res.json();
            appendGuide('Resubmitted OK: ' + (j.id || 'n/a'));
            // remove this item from pending
            const all = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
            const index = all.findIndex(p => p.ts === item.ts && JSON.stringify(p.payload) === JSON.stringify(item.payload));
            if (index >= 0) { all.splice(index, 1); localStorage.setItem('pendingSubmissions', JSON.stringify(all)); }
          } else {
            console.warn('retry failed for item', item);
          }
        } catch (err) { console.warn('retry item failed', err); }
      }
    } catch (err) { console.error('retryPendingSubmissions error', err); }
  }

  // Add a small UI control to retry pending submissions
  (function addRetryButton() {
    const container = document.querySelector('.final-data-area');
    if (!container) return;
    const btn = document.createElement('button');
    btn.textContent = 'Retry Pending Submissions';
    btn.style.marginLeft = '8px';
    btn.addEventListener('click', retryPendingSubmissions);
    container.appendChild(btn);
  })();

  function printFinal() {
    // Use the browser print — create a printable window
    const payload = collectFinalData();
    const w = window.open('', '_blank');
    const html = `<html><head><title>Loan Application</title></head><body><pre>${JSON.stringify(payload, null, 2)}</pre></body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.print();
  }

  submitButton.addEventListener('click', submitToServer);
  downloadPdfButton.addEventListener('click', downloadPdf);
  printButton.addEventListener('click', printFinal);

  function repeatGuide() {
    appendGuide(lastGuideText || 'Nothing to repeat.');
  }

  function showHelp() {
    const help = 'Assistant commands: next, previous (or prev), repeat, help, start over, cancel.';
    appendGuide(help);
    // try to speak if available
    if (window.speechSynthesis) {
      try {
        const u = new SpeechSynthesisUtterance(help);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch (e) {
        // ignore
      }
    }
  }

  function enableInputsForAuth(enable) {
    authAccountInput.disabled = !enable;
    authOTPInput.disabled = !enable;
  }

  function enableFormInputs(enable) {
    formName.disabled = !enable;
    formAmount.disabled = !enable;
    formPurpose.disabled = !enable;
  }

  startButton.addEventListener('click', () => {
    startOver();
    goToStep(1);
    appendUser('');
  });

  function promptForSpeech(promptText) {
    // Fallback simulation for voice input using prompt().
    return window.prompt(promptText || 'Simulated mic input (type text)');
  }

  // Process recognized or typed input in a single place
  async function processInput(value) {
    if (!value) return;
    const trimmed = value.trim();
    appendUser(trimmed || '[no input]');

    // If assistant mode is enabled, check for commands first
    if (assistantToggle && assistantToggle.checked) {
      const cmd = trimmed.toLowerCase();
      if (cmd.includes('next')) { nextStep(); return; }
      if (cmd.includes('previous') || cmd.includes('prev') || cmd.includes('back')) { prevStep(); return; }
      if (cmd.includes('repeat')) { repeatGuide(); return; }
      if (cmd.includes('help')) { showHelp(); return; }
      if (cmd.includes('start over')) { startOver(); return; }
      if (cmd.includes('cancel')) { appendGuide('Operation cancelled.'); status.textContent = 'Cancelled.'; return; }
      // For non-command utterances, send to AI assistant (non-blocking)
      try { sendToAI(trimmed, collectFinalData()); } catch (e) { console.warn('sendToAI errored', e); }
      // continue with local processing as before
    }

    if (currentStep === 1) {
      // language detection (simple)
      const v = trimmed.toLowerCase();
      let lang = 'English';
      if (v.includes('tamil')) lang = 'Tamil';
      else if (v.includes('hindi')) lang = 'Hindi';
      selectedLanguage = lang;
      // update recognition language if available
      if (recognition) {
        if (lang === 'Hindi') recognition.lang = 'hi-IN';
        else if (lang === 'Tamil') recognition.lang = 'ta-IN';
        else recognition.lang = 'en-US';
      }
      appendGuide(`Language selected: ${lang}. Proceeding to authentication.`);
      status.textContent = `Selected ${lang}. Now authenticate by providing your 10-digit mobile number.`;
      goToStep(2);
      enableInputsForAuth(true);
      // focus account input
      authAccountInput.focus();
      return;
    }

    if (currentStep === 2) {
      // if account empty, treat as account input; else if otp empty treat as otp
      if (!authAccountInput.value) {
        // try to extract digits
        const digits = trimmed.replace(/\D/g, '');
        authAccountInput.value = digits;
        appendGuide('Account received. Sending mock OTP to that number.');
        generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        mockOtpValue.textContent = generatedOtp;
        mockOtpText.hidden = false;
        mockAutofill.hidden = false;
        mockResend.hidden = false;
        status.textContent = 'Mock OTP generated. Click "Speak Now" and type the OTP or use Auto-fill.';
        return;
      }

      if (!authOTPInput.value) {
        // treat as otp
        const digits = trimmed.replace(/\D/g, '');
        authOTPInput.value = digits;
        if (generatedOtp && authOTPInput.value === generatedOtp) {
          appendGuide('OTP verified. Proceeding to loan application form.');
          status.textContent = 'OTP verified. Fill the loan form via voice (Speak Now) or type into fields.';
          goToStep(3);
          enableFormInputs(true);
          formName.focus();
        } else {
          appendGuide('OTP incorrect. Try again or use Auto-fill.');
          status.textContent = 'OTP incorrect; try again or use Auto-fill.';
        }
        return;
      }
    }

    if (currentStep === 3) {
      // sequentially fill name, amount, purpose
      if (!formName.value) {
        formName.value = trimmed;
        appendGuide('Received name. Now provide loan amount.');
        status.textContent = 'Provide loan amount (digits).';
        return;
      }
      if (!formAmount.value) {
        const digits = trimmed.replace(/[^0-9.]/g, '');
        formAmount.value = digits || trimmed;
        appendGuide('Received amount. Now provide loan purpose.');
        status.textContent = 'Provide loan purpose (short text).';
        return;
      }
      if (!formPurpose.value) {
        formPurpose.value = trimmed;
        appendGuide('Loan form completed. Preparing final data.');
        status.textContent = 'Form complete. See final data below.';
        const final = {
          name: formName.value,
          amount: formAmount.value,
          purpose: formPurpose.value,
          account: authAccountInput.value
        };
        dataDisplay.textContent = JSON.stringify(final, null, 2);
        // After finishing the form, optionally call AI to summarize next steps
        if (assistantToggle && assistantToggle.checked) sendToAI(JSON.stringify(final));
        return;
      }
    }
  }

  // Send transcript/context to AI endpoint and handle reply
  async function sendToAI(message) {
    try {
      const payload = { message, language: selectedLanguage };
      const res = await fetch('http://localhost:3000/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
        const j = await res.json();
        if (j && j.ok && j.reply) {
          appendGuide(j.reply);
          status.textContent = 'Assistant replied.';
          speakAssistant(j.reply);
        } else {
          console.warn('AI assist no reply', j);
        }
    } catch (e) {
      console.error('sendToAI error', e);
    }
  }

  function speakAssistant(text) {
    if (!window.speechSynthesis) return;
    try {
      const utter = new SpeechSynthesisUtterance(text);
      // pick voice lang based on selectedLanguage
      if (selectedLanguage === 'Hindi') utter.lang = 'hi-IN';
      else if (selectedLanguage === 'Tamil') utter.lang = 'ta-IN';
      else utter.lang = 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('speakAssistant failed', e);
    }
  }

  // Start/stop speech recognition
  function startListening() {
    if (!recognition) return false;
    try {
      // set recognition language according to selectedLanguage
      if (selectedLanguage === 'Hindi') recognition.lang = 'hi-IN';
      else if (selectedLanguage === 'Tamil') recognition.lang = 'ta-IN';
      else recognition.lang = 'en-US';
      recognition.start();
      isListening = true;
      micButton.classList.add('listening');
      status.textContent = 'Listening... Speak now.';
      return true;
    } catch (e) {
      console.warn('Recognition start failed', e);
      return false;
    }
  }

  function stopListening() {
    if (!recognition) return;
    try {
      recognition.stop();
    } catch (e) {
      // ignore
    }
    isListening = false;
    micButton.classList.remove('listening');
  }

  if (recognition) {
    recognition.onresult = (ev) => {
      const transcript = Array.from(ev.results).map(r => r[0].transcript).join(' ');
      appendUser(transcript);
      processInput(transcript);
    };
    recognition.onerror = (ev) => {
      console.error('Speech recognition error', ev.error);
      appendGuide('Microphone error or permission denied. Falling back to text input.');
      status.textContent = 'Microphone error or permission denied. Use text input.';
      isListening = false;
      micButton.classList.remove('listening');
    };
    recognition.onend = () => {
      isListening = false;
      micButton.classList.remove('listening');
      // keep UI consistent
    };
  }

  micButton.addEventListener('click', async () => {
    if (currentStep === 0) {
      status.textContent = 'Click "Start Guide" first.';
      return;
    }

    // If browser supports SpeechRecognition, toggle listening
    if (recognitionSupported) {
      if (!isListening) {
        const ok = startListening();
        if (!ok) {
          // fallback to prompt
          const value = promptForSpeech(currentStep === 1 ? 'Say language: English, Hindi or Tamil' : 'Speak or type your response');
          if (value !== null) processInput(value);
        }
      } else {
        stopListening();
      }
      return;
    }

    // Fallback: use prompt()
    const value = promptForSpeech(currentStep === 1 ? 'Say language: English, Hindi or Tamil' : 'Speak or type your response');
    if (value === null) return; // user cancelled
    processInput(value);
  });

  mockAutofill.addEventListener('click', () => {
    if (generatedOtp) {
      authOTPInput.value = generatedOtp;
      appendGuide('OTP auto-filled. Click "Speak Now" to submit OTP (or continue).');
      status.textContent = 'OTP auto-filled. Click "Speak Now" to proceed.';
    }
  });

  mockResend.addEventListener('click', () => {
    generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    mockOtpValue.textContent = generatedOtp;
    appendGuide('Mock OTP resent. Use Auto-fill or speak the new OTP.');
    status.textContent = 'New mock OTP sent (displayed).';
  });

  // Navigation button handlers
  nextButton.addEventListener('click', () => nextStep());
  prevButton.addEventListener('click', () => prevStep());

  // Assistant controls
  if (assistantToggle) {
    assistantToggle.addEventListener('change', () => {
      appendGuide(assistantToggle.checked ? 'Assistant mode enabled.' : 'Assistant mode disabled.');
    });
  }

  voiceHelpButton.addEventListener('click', () => {
    showHelp();
  });

  // Initialize UI state
  micButton.disabled = true;
  showPage(0);
  enableInputsForAuth(false);
  enableFormInputs(false);
  appendGuide('Click "Start Guide" to begin.');
  status.textContent = 'Click "Start Guide" to begin language selection.';
})();
