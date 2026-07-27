const fs = require('fs');
const path = 'c:/zn/backend/src/modules/hr/hr.service.ts';
let c = fs.readFileSync(path, 'utf8');

const fetchPoliciesCode = `    const range = monthRange(periodMonth);
    const policies = await this.getPayrollPoliciesConfig({ tenantId, accountId, userId: 0 } as any);
`;
c = c.replace('    const range = monthRange(periodMonth);\n', fetchPoliciesCode);

const calculationCode = `      const allowanceAmount = Number((compensationAllowance + adjustments.allowance + empAdjAllowance).toFixed(2));
      const assetRecoveryDeductionAmount = Number(empAdjAssetRecoveryDeduction.toFixed(2));
      
      let taxDeduction = 0;
      let insuranceDeduction = 0;
      let taxInsuranceNotes = '';

      if (policies.hrSocialInsuranceEnabled && employee.has_social_insurance) {
        const insuranceBasis = Number(employee.insurance_salary) || baseSalary;
        let clampedBasis = insuranceBasis;
        if (policies.insuranceConfig) {
          if (clampedBasis < policies.insuranceConfig.minSalary) clampedBasis = policies.insuranceConfig.minSalary;
          if (clampedBasis > policies.insuranceConfig.maxSalary) clampedBasis = policies.insuranceConfig.maxSalary;
          insuranceDeduction = Number((clampedBasis * (policies.insuranceConfig.employeePct / 100)).toFixed(2));
        } else {
          insuranceDeduction = Number((clampedBasis * 0.11).toFixed(2));
        }
        if (insuranceDeduction > 0) {
          taxInsuranceNotes += \`تأمينات: \${insuranceDeduction}. \`;
        }
      }

      if (policies.hrIncomeTaxEnabled && employee.has_income_tax) {
        const taxableIncome = Math.max(0, baseSalary + allowanceAmount - insuranceDeduction);
        const annualTaxable = taxableIncome * 12;
        const exemption = Number(policies.taxPersonalExemption) || 20000;
        let netAnnualTaxable = Math.max(0, annualTaxable - exemption);
        
        let annualTax = 0;
        let previousMax = 0;
        const brackets = policies.taxBrackets || [
          { max: 40000, rate: 0 },
          { max: 55000, rate: 10 },
          { max: 70000, rate: 15 },
          { max: 200000, rate: 20 },
          { max: 400000, rate: 22.5 },
          { max: 999999999, rate: 25 },
        ];
        for (const bracket of brackets) {
          const bracketMax = bracket.max;
          const rate = bracket.rate / 100;
          if (netAnnualTaxable > 0) {
            const amountInBracket = Math.min(netAnnualTaxable, bracketMax - previousMax);
            annualTax += amountInBracket * rate;
            netAnnualTaxable -= amountInBracket;
            previousMax = bracketMax;
          }
        }
        taxDeduction = Number((annualTax / 12).toFixed(2));
        if (taxDeduction > 0) {
          taxInsuranceNotes += \`ضرائب: \${taxDeduction}. \`;
        }
      }

      empAdjDeduction += taxDeduction + insuranceDeduction;

      const deductionAmount = Number((compensationDeduction + adjustments.deduction + empAdjDeduction + assetRecoveryDeductionAmount).toFixed(2));
`;

c = c.replace(`      const allowanceAmount = Number((compensationAllowance + adjustments.allowance + empAdjAllowance).toFixed(2));
      const assetRecoveryDeductionAmount = Number(empAdjAssetRecoveryDeduction.toFixed(2));
      const deductionAmount = Number((compensationDeduction + adjustments.deduction + empAdjDeduction + assetRecoveryDeductionAmount).toFixed(2));`, calculationCode);


c = c.replace(`      ].filter(Boolean);
      const notes = combineNotes(clean(existingItem?.notes), ...generatedNotes);`, `      ].filter(Boolean);
      const notes = combineNotes(clean(existingItem?.notes), taxInsuranceNotes, ...generatedNotes);`);

fs.writeFileSync(path, c);
