import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { authService } from '../../services/auth.service';
import { setCredentials } from '../../redux/authSlice';
import { landingPathForRole } from '../../utils/roleRoutes';

const schema = z.object({ email: z.string().email(), password: z.string().min(1), otp: z.string().optional() });

export const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  
  const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });

  const login = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      dispatch(setCredentials(data));
      navigate(landingPathForRole(data.user?.role));
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <form className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900" onSubmit={handleSubmit((values) => login.mutate(values))}>
        <h2 className="mb-6 text-center text-2xl font-bold dark:text-white">Login</h2>
        <label className="mb-4 block text-sm font-medium dark:text-slate-200">
          Email
          <input className="input mt-1 w-full" placeholder="Enter your email" {...register('email')} />
        </label>
        <label className="mb-6 block text-sm font-medium dark:text-slate-200">
          Password
          <div className="relative mt-1">
            <input className="input w-full pr-10" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" {...register('password')} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        {login.error && <p className="mb-4 text-sm text-rose-600">{login.error.response?.data?.message || login.error.message}</p>}
        <button className="btn-primary w-full" disabled={login.isPending}>Login</button>
      </form>
    </div>
  );
};
