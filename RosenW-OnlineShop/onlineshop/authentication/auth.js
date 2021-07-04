const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
module.exports = (passport) => {
    passport.serializeUser((user, done) => {
        done(null, user);
    });
    passport.deserializeUser((user, done) => {
        done(null, user);
    });
    passport.use(new GoogleStrategy({
            clientID: '614520466378-npmfmap2vlkp23r1t4smiejsk10akdof.apps.googleusercontent.com',
            clientSecret: 'pgDm52AdABjZGpWsK6EDR0E7',
            callbackURL: 'http://127.0.0.1:3000/auth/google/callback'
        },
        (token, refreshToken, profile, done) => {
            return done(null, {
                profile: profile,
                token: token
            });
        }));
};
