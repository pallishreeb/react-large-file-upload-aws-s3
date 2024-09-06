import React from 'react';
import { GoogleOAuthProvider ,GoogleLogin} from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
const GoogleSignIn = () => {


    const handleSuccess = (credentialResponse) =>{
        console.log("Google Sign In Success",credentialResponse);
        //send this crendetial to backend api and authenticate
        const decode = jwtDecode(credentialResponse?.credential)
        console.log(decode)
        
    }

    const handleError = () =>{
        console.log("Google Sign In Error");
    }

  return (
<div className="flex items-center justify-center mt-8">
    <h1 className="text-2xl font-bold text-blue-500">Google Sign-In</h1>

    <GoogleOAuthProvider clientId=''>
        <GoogleLogin 
        onSuccess={handleSuccess}
        onError={handleError}
        />
    </GoogleOAuthProvider>
  </div>

  );
};

export default GoogleSignIn;
