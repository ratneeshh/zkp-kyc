pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";

template AgeCheck() {
    // Private inputs — never leave the browser
    signal input birthYear;
    signal input birthMonth;
    signal input birthDay;

    // Public inputs — sent to verifier
    signal input currentYear;
    signal input currentMonth;
    signal input currentDay;

    // Output
    signal output isOldEnough;

    // Calculate age more precisely
    // Step 1: base year difference
    signal yearDiff;
    yearDiff <== currentYear - birthYear;

    // Step 2: check if birthday has NOT yet occurred this year
    // if currentMonth < birthMonth → birthday not yet happened → subtract 1
    // if currentMonth == birthMonth and currentDay < birthDay → subtract 1
    // We use: adjustedAge = yearDiff - 1 if birthday hasn't passed, else yearDiff

    // Has the birth month passed?
    component monthPassed = GreaterEqThan(8);
    monthPassed.in[0] <== currentMonth;
    monthPassed.in[1] <== birthMonth;

    // Has the birth day passed (within same month)?
    component dayPassed = GreaterEqThan(8);
    dayPassed.in[0] <== currentDay;
    dayPassed.in[1] <== birthDay;

    // Is it the exact birth month?
    component sameMonth = IsEqual();
    sameMonth.in[0] <== currentMonth;
    sameMonth.in[1] <== birthMonth;

    // birthday fully passed = monthPassed AND (not sameMonth OR dayPassed)
    // = monthPassed.out * (1 - sameMonth.out) + monthPassed.out * sameMonth.out * dayPassed.out
    signal monthPassedNotSame;
    monthPassedNotSame <== monthPassed.out * (1 - sameMonth.out);

    signal monthAndSame;
    monthAndSame <== monthPassed.out * sameMonth.out;

    signal monthPassedSameDay;
    monthPassedSameDay <== monthAndSame * dayPassed.out;

    signal birthdayPassed;
    birthdayPassed <== monthPassedNotSame + monthPassedSameDay;

    // Actual age = yearDiff if birthday passed, else yearDiff - 1
    signal actualAge;
    actualAge <== yearDiff - 1 + birthdayPassed;

    // Check actualAge >= 18
    component ageCheck = GreaterEqThan(8);
    ageCheck.in[0] <== actualAge;
    ageCheck.in[1] <== 18;

    isOldEnough <== ageCheck.out;
}

component main {public [currentYear, currentMonth, currentDay]} = AgeCheck();