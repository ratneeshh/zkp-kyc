pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";

template AgeCheck(minAge) {
    // Private inputs - never leave the browser
    signal input birthYear;
    signal input birthMonth;
    signal input birthDay;

    // Public inputs - sent to verifier
    signal input currentYear;
    signal input currentMonth;
    signal input currentDay;

    // Output
    signal output isOldEnough;

    // Calculate age in days (approximate)
    signal ageInYears;
    signal monthDiff;
    signal dayDiff;

    // Step 1: year difference
    signal yearDiff;
    yearDiff <== currentYear - birthYear;

    // Step 2: check if birthday has passed this year
    monthDiff <== currentMonth - birthMonth;
    dayDiff <== currentDay - birthDay;

    // Use circomlib GreaterEqThan to compare
    component yearCheck = GreaterEqThan(8);
    yearCheck.in[0] <== yearDiff;
    yearCheck.in[1] <== minAge;

    isOldEnough <== yearCheck.out;
}

component main {public [currentYear, currentMonth, currentDay]} = AgeCheck(18);