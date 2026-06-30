import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useFirstRunSetupPageController } from '@/features/activation/hooks/useFirstRunSetupPageController';
import { Step1Welcome } from './Step1Welcome';
import { Step2Details } from './Step2Details';
import { Step3Industry } from './Step3Industry';
import { Step4Loading } from './Step4Loading';
import { Step5Success } from './Step5Success';

export function OnboardingWizard() {
  const { t } = useTranslation();
  const { form, updateField, handleSubmit, error } = useFirstRunSetupPageController();
  const [step, setStep] = useState(1);

  // Extra state for visual steps not in the backend yet
  const [extraData, setExtraData] = useState({
    role: '',
    companySize: '',
    taxId: '',
    address: '',
    city: '',
    industry: ''
  });

  const updateExtra = (key: keyof typeof extraData, value: string) => {
    setExtraData(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 5));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  // Step 4 triggers the actual submit
  const submitWizard = async () => {
    setStep(4); // Move to loading screen
    
    const syntheticEvent = { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>;
    
    // Fill in default required backend fields if not asked in UI
    if (!form.branchName) updateField('branchName', 'الفرع الرئيسي');
    if (!form.locationName) updateField('locationName', 'المخزن الرئيسي');
    
    // We let the loading screen show for a few seconds before actually submitting
    // because the user requested an animation.
    setTimeout(async () => {
      const success = await handleSubmit(syntheticEvent);
      if (!success) {
        setStep(3); // Go back if error so user can see it and correct
      }
    }, 2500);
  };

  const stepsCount = 3;

  return (
    <div className="onboarding-screen">
      <div className="onboarding-container">
        {/* Left side (or Right in RTL) Hero section */}
        <div className="onboarding-hero">
          <div className="onboarding-hero-logo">
            <img src="./logo.png" alt="ZSystems Logo" style={{ maxWidth: '180px', height: 'auto', marginBottom: '1rem' }} />
          </div>
          <h1>{t('firstRun.wizard.title')}</h1>
          <p>{t('firstRun.wizard.desc')}</p>
        </div>

        {/* Wizard Form Area */}
        <div className="onboarding-card">
          {step <= stepsCount && (
            <div className="wizard-progress">
              <div className="wizard-progress-bar-fill" style={{ width: `${((step - 1) / (stepsCount - 1)) * 100}%` }} />
              {[1, 2, 3].map((num) => (
                <div key={num} className={`wizard-step-node ${step === num ? 'active' : step > num ? 'completed' : ''}`}>
                  {step > num ? '✓' : num}
                </div>
              ))}
            </div>
          )}

          {error && step <= 3 && (
            <div className="error-box" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          {step === 1 && (
            <Step1Welcome 
              form={form} 
              updateField={updateField} 
              extraData={extraData}
              updateExtra={updateExtra}
              onNext={handleNext} 
            />
          )}
          {step === 2 && (
            <Step2Details 
              form={form} 
              updateField={updateField}
              onNext={handleNext} 
              onBack={handleBack} 
            />
          )}
          {step === 3 && (
            <Step3Industry 
              extraData={extraData} 
              updateExtra={updateExtra}
              onNext={submitWizard} 
              onBack={handleBack} 
            />
          )}
          {step === 4 && <Step4Loading />}
          {step === 5 && <Step5Success />}
        </div>
      </div>
    </div>
  );
}
