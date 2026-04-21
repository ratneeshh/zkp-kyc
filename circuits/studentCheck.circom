pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";

template StudentCheck() {
    // Private inputs — extracted from ID card, never leave browser
    signal input birthYear;
    signal input birthMonth;
    signal input birthDay;
    signal input validTillYear;
    signal input validTillMonth;
    signal input institutionTier; // 1=IIT, 2=NIT, 3=State, 4=Private

    // Public inputs — current date + minimum tier
    signal input currentYear;
    signal input currentMonth;
    signal input currentDay;
    signal input minTier; // verifier sets what tier they accept (1=IIT only, 2=NIT+, 3=any)

    // Outputs
    signal output isAdult;
    signal output isEnrolled;
    signal output isTierValid;
    signal output isValidStudent; // all three combined

    // ── Age check (same logic as ageCheck.circom) ──
    signal yearDiff;
    yearDiff <== currentYear - birthYear;

    component monthPassed = GreaterEqThan(8);
    monthPassed.in[0] <== currentMonth;
    monthPassed.in[1] <== birthMonth;

    component dayPassed = GreaterEqThan(8);
    dayPassed.in[0] <== currentDay;
    dayPassed.in[1] <== birthDay;

    component sameMonth = IsEqual();
    sameMonth.in[0] <== currentMonth;
    sameMonth.in[1] <== birthMonth;

    signal monthPassedNotSame;
    monthPassedNotSame <== monthPassed.out * (1 - sameMonth.out);

    signal monthAndSame;
    monthAndSame <== monthPassed.out * sameMonth.out;

    signal monthPassedSameDay;
    monthPassedSameDay <== monthAndSame * dayPassed.out;

    signal birthdayPassed;
    birthdayPassed <== monthPassedNotSame + monthPassedSameDay;

    signal actualAge;
    actualAge <== yearDiff - 1 + birthdayPassed;

    component ageCheck = GreaterEqThan(8);
    ageCheck.in[0] <== actualAge;
    ageCheck.in[1] <== 18;
    isAdult <== ageCheck.out;

    // ── Enrollment check (validTillYear > currentYear OR same year validTillMonth >= currentMonth) ──
    component yearGt = GreaterThan(8);
    yearGt.in[0] <== validTillYear;
    yearGt.in[1] <== currentYear;

    component yearEq = IsEqual();
    yearEq.in[0] <== validTillYear;
    yearEq.in[1] <== currentYear;

    component monthGe = GreaterEqThan(8);
    monthGe.in[0] <== validTillMonth;
    monthGe.in[1] <== currentMonth;

    signal sameYearValid;
    sameYearValid <== yearEq.out * monthGe.out;

    component enrolledCheck = GreaterEqThan(2);
    enrolledCheck.in[0] <== yearGt.out + sameYearValid;
    enrolledCheck.in[1] <== 1;
    isEnrolled <== enrolledCheck.out;

    // ── Tier check (institutionTier <= minTier means valid — lower number = higher tier) ──
    component tierCheck = LessEqThan(4);
    tierCheck.in[0] <== institutionTier;
    tierCheck.in[1] <== minTier;
    isTierValid <== tierCheck.out;

    // ── Combined: all three must pass ──
    signal adultAndEnrolled;
    adultAndEnrolled <== isAdult * isEnrolled;
    isValidStudent <== adultAndEnrolled * isTierValid;
}

component main {public [currentYear, currentMonth, currentDay, minTier]} = StudentCheck();