import type {Metadata} from 'next';
import LoginForm from './LoginForm';

export const metadata:Metadata={title:'Admin sign in | Fajify',description:'Secure sign in to the Fajify administration workspace.'};

export default function Page(){return <LoginForm/>;}
