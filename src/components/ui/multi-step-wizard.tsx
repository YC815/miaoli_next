"use client";

import React, { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

export interface WizardStepProps {
  title: string;
  children: ReactNode;
  isValid?: boolean;
  onValidate?: () => boolean;
}

export function WizardStep({ children }: WizardStepProps) {
  return <div className="space-y-6">{children}</div>;
}

interface MultiStepWizardProps {
  currentStep: number;
  totalSteps: number;
  onStepChange: (step: number) => void;
  onCancel: () => void;
  onComplete: () => void;
  children: ReactNode[];
  
  // Custom button configurations
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  nextButtonText?: string;
  previousButtonText?: string;
  cancelButtonText?: string;
  completeButtonText?: string;
  
  // Step validation
  onNextStep?: () => boolean;
  onPreviousStep?: () => boolean;
  
  // Custom buttons for specific steps
  customButtons?: ReactNode;
}

export function MultiStepWizard({
  currentStep,
  totalSteps,
  onStepChange,
  onCancel,
  onComplete,
  children,
  canGoNext = true,
  canGoPrevious = true,
  nextButtonText = "下一步",
  previousButtonText = "上一步",
  cancelButtonText = "取消",
  completeButtonText = "完成",
  onNextStep,
  onPreviousStep,
  customButtons
}: MultiStepWizardProps) {
  
  const handleNext = () => {
    if (onNextStep && !onNextStep()) {
      return;
    }
    
    if (currentStep < totalSteps - 1) {
      onStepChange(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (onPreviousStep && !onPreviousStep()) {
      return;
    }
    
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="flex flex-col">
      {/* Step Indicator */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center space-x-2">
          {Array.from({ length: totalSteps }, (_, index) => (
            <React.Fragment key={index}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index === currentStep
                    ? "bg-primary text-primary-foreground"
                    : index < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
              {index < totalSteps - 1 && (
                <div
                  className={`w-8 h-px ${
                    index < currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1">
        {children[currentStep]}
      </div>

      {/* Navigation Buttons */}
      <DialogFooter className="mt-6">
        {customButtons || (
          <>
            {isFirstStep ? (
              <Button variant="outline" onClick={onCancel}>
                {cancelButtonText}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={!canGoPrevious}
              >
                {previousButtonText}
              </Button>
            )}
            
            <Button
              onClick={handleNext}
              disabled={!canGoNext}
            >
              {isLastStep ? completeButtonText : nextButtonText}
            </Button>
          </>
        )}
      </DialogFooter>
    </div>
  );
}