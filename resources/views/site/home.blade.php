@php
    $services = [
        ['icon' => 'hand-heart', 'title' => 'Elderly Care', 'text' => 'Daily help with bathing, meals, medicines, walking and company for senior family members.'],
        ['icon' => 'stethoscope', 'title' => 'Nursing Care', 'text' => 'Trained nurses for injections, dressings, BP and sugar checks, catheter and feeding care.'],
        ['icon' => 'heart-pulse', 'title' => 'ICU at Home', 'text' => 'ICU-trained nurses for critical patients on oxygen, monitors or ventilator support at home.'],
        ['icon' => 'bed-double', 'title' => 'Post-Surgery Care', 'text' => 'Safe recovery after an operation or hospital stay: wound care, mobility and medicines on time.'],
        ['icon' => 'baby', 'title' => 'Baby & Mother Care', 'text' => 'Experienced nannies for newborn care, baby massage and support for the new mother.'],
        ['icon' => 'activity', 'title' => 'Physiotherapy', 'text' => 'Home physiotherapy after stroke, fracture or surgery to regain strength and movement.'],
        ['icon' => 'heart-handshake', 'title' => 'Palliative Care', 'text' => 'Gentle, respectful comfort care for patients with serious or long-term illness.'],
        ['icon' => 'accessibility', 'title' => 'Patient Attendant', 'text' => 'Reliable attendants for day-to-day patient support, hygiene and help moving around.'],
    ];
    $roles = ['Staff Nurse', 'ICU Nurse', 'Caretaker', 'Nanny', 'Physiotherapist', 'Attendant', 'Ward Boy'];
    $nav = ['home' => 'Home', 'about' => 'About', 'services' => 'Services', 'career' => 'Career', 'contact' => 'Contact'];
    $description = 'Home nursing, elderly care, ICU at home, baby care and physiotherapy by verified caregivers. 8, 12 and 24 hour day and night shifts.';
@endphp
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>{{ $name }} | Home Nursing &amp; Patient Care at Home</title>
    <meta name="description" content="{{ $description }}">
    <meta name="theme-color" content="#24366d">
    <link rel="canonical" href="{{ url('/') }}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{{ $name }}: care for your loved ones, at home">
    <meta property="og:description" content="{{ $description }}">
    <meta property="og:url" content="{{ url('/') }}">
    <meta property="og:image" content="{{ url('/icons/icon-512.png') }}">
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script type="application/ld+json">
        {!! json_encode(array_filter([
            '@context' => 'https://schema.org',
            '@type' => 'HomeHealthCareService',
            'name' => $name,
            'url' => url('/'),
            'logo' => url('/brand/logo.png'),
            'image' => url('/icons/icon-512.png'),
            'description' => $description,
            'telephone' => $phone,
            'email' => $email,
            'address' => $address,
            'areaServed' => 'Gujarat, India',
        ]), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}
    </script>
    @vite('resources/css/app.css')
    <style>
        section[id] { scroll-margin-top: 5rem; }
    </style>
</head>
<body class="bg-white antialiased">

{{-- Header --}}
<header id="top" class="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <a href="#home" class="shrink-0" aria-label="{{ $name }}">
            <img src="/brand/logo.png" alt="{{ $name }}" class="h-10 w-auto sm:h-12" width="118" height="48">
        </a>
        <nav class="hidden items-center gap-1 md:flex" aria-label="Main">
            @foreach ($nav as $id => $label)
                <a href="#{{ $id }}" class="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700">{{ $label }}</a>
            @endforeach
        </nav>
        <div class="flex items-center gap-2">
            <a href="/client" class="btn-primary hidden sm:inline-flex">Request care <x-icon name="arrow-right" :size="16" /></a>
            <button type="button" id="menu-button" class="rounded-xl p-2 text-slate-700 hover:bg-slate-100 md:hidden" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
                <x-icon name="menu" :size="24" class="menu-open" />
                <x-icon name="x" :size="24" class="menu-close hidden" />
            </button>
        </div>
    </div>
    <nav id="mobile-menu" class="hidden border-t border-slate-100 bg-white px-4 pb-4 pt-2 md:hidden" aria-label="Mobile">
        @foreach ($nav as $id => $label)
            <a href="#{{ $id }}" class="block rounded-xl px-3 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50">{{ $label }}</a>
        @endforeach
        <a href="/client" class="btn-primary mt-2 w-full py-3 text-base">Request home care</a>
    </nav>
</header>

<main>
    {{-- Home --}}
    <section id="home" class="relative overflow-hidden bg-gradient-to-b from-accent-50/70 via-white to-white">
        <div class="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent-200/40 blur-3xl"></div>
        <div class="pointer-events-none absolute -left-40 top-40 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl"></div>
        <div class="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div>
                <p class="inline-flex items-center gap-2 rounded-full border border-accent-200 bg-white px-3 py-1 text-xs font-bold text-accent-700 shadow-sm">
                    <x-icon name="badge-check" :size="15" /> Verified caregivers · Day &amp; night shifts
                </p>
                <h1 class="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
                    Caring for your loved ones, <span class="text-brand-gradient">right at home.</span>
                </h1>
                <p class="mt-5 max-w-xl text-lg text-slate-600">
                    Trained nurses, caretakers, nannies and physiotherapists who come to your home, so your family gets hospital-quality care with the comfort of home.
                </p>
                <p lang="gu" class="mt-2 text-base font-semibold text-brand-700">ઘર જેવો પ્રેમ, હોસ્પિટલ જેવી સંભાળ.</p>
                <div class="mt-8 flex flex-col gap-3 sm:flex-row">
                    <a href="/client" class="btn-primary px-6 py-3.5 text-base">Request home care <x-icon name="arrow-right" :size="18" /></a>
                    @if ($telLink)
                        <a href="{{ $telLink }}" class="btn-secondary px-6 py-3.5 text-base"><x-icon name="phone" :size="18" /> Call {{ $phone }}</a>
                    @else
                        <a href="#services" class="btn-secondary px-6 py-3.5 text-base">Our services</a>
                    @endif
                </div>
                <dl class="mt-10 grid max-w-lg grid-cols-3 gap-3">
                    @foreach ([['8 · 12 · 24', 'hour shifts'], ['Day & Night', 'care available'], ['Aadhaar', 'verified staff']] as [$big, $small])
                        <div class="rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-center shadow-sm">
                            <dt class="text-base font-extrabold text-brand-700 sm:text-lg">{{ $big }}</dt>
                            <dd class="mt-0.5 text-xs font-medium text-slate-500">{{ $small }}</dd>
                        </div>
                    @endforeach
                </dl>
            </div>

            <div class="relative mx-auto w-full max-w-md lg:max-w-none">
                <div class="bg-brand-gradient relative overflow-hidden rounded-[2rem] p-8 pb-12 text-white shadow-2xl shadow-brand-700/30 sm:p-10 sm:pb-14">
                    <img src="/brand/emblem-white.png" alt="" class="pointer-events-none absolute -bottom-10 -right-10 w-64 opacity-10">
                    <div class="flex h-20 w-20 items-center justify-center rounded-3xl bg-white p-2.5 shadow-xl">
                        <img src="/brand/emblem.png" alt="" class="h-full w-full object-contain">
                    </div>
                    <p class="mt-6 text-2xl font-extrabold leading-snug">Every duty is tracked, so you always know your loved one is cared for.</p>
                    <ul class="mt-6 space-y-3 text-sm">
                        @foreach (['Caregiver checks in with a selfie and live location', 'Fixed shift timings with on-time reminders', 'Clear bills for every shift'] as $point)
                            <li class="flex items-start gap-3">
                                <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20"><x-icon name="circle-check" :size="15" /></span>
                                <span class="text-white/90">{{ $point }}</span>
                            </li>
                        @endforeach
                    </ul>
                </div>
                <div class="absolute -bottom-6 -left-4 hidden items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-xl sm:flex">
                    <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><x-icon name="shield-check" :size="20" /></span>
                    <div>
                        <p class="text-sm font-bold text-slate-900">Background checked</p>
                        <p class="text-xs text-slate-500">Aadhaar &amp; documents verified</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    {{-- About --}}
    <section id="about" class="py-16 sm:py-24">
        <div class="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-5 lg:items-center">
            <div class="lg:col-span-2">
                <p class="text-sm font-bold uppercase tracking-wider text-accent-600">About us</p>
                <h2 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Care you can trust, from people who care.</h2>
                <p class="mt-5 text-slate-600">
                    {{ $name }} brings professional healthcare to your doorstep. We match every family with the right caregiver for the patient's needs, whether it is a few hours of help each day or round-the-clock nursing.
                </p>
                <p class="mt-4 text-slate-600">
                    Every caregiver's application, Aadhaar and documents are reviewed by our team before they join. Once care starts, we stay with you: duties are tracked, timings are followed and our team is a phone call away.
                </p>
            </div>
            <div class="grid content-start gap-4 sm:grid-cols-2 lg:col-span-3">
                @foreach ([
                    ['user-round-check', 'Verified caregivers', 'Identity and documents checked for every staff member before their first duty.'],
                    ['map-pinned', 'Live duty check-in', 'Caregivers start each duty with a selfie and location, so attendance is never in doubt.'],
                    ['clock', 'Flexible shifts', 'Choose 8, 12 or 24 hour care, day or night, and change it as your needs change.'],
                    ['wallet', 'Honest, clear billing', 'One fixed charge per shift and a detailed bill listing every duty.'],
                ] as [$icon, $title, $text])
                    <div class="card p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
                        <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><x-icon :name="$icon" :size="22" /></span>
                        <h3 class="mt-4 text-lg font-bold text-slate-900">{{ $title }}</h3>
                        <p class="mt-1.5 text-sm text-slate-600">{{ $text }}</p>
                    </div>
                @endforeach
            </div>
        </div>
    </section>

    {{-- Services --}}
    <section id="services" class="bg-slate-50 py-16 sm:py-24">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
            <div class="mx-auto max-w-2xl text-center">
                <p class="text-sm font-bold uppercase tracking-wider text-accent-600">Home services</p>
                <h2 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Everything your family needs, at home</h2>
                <p class="mt-4 text-slate-600">From a few hours of help to full-time nursing, pick the care that fits.</p>
            </div>
            <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                @foreach ($services as $service)
                    <div class="card group p-6 transition hover:-translate-y-1 hover:border-accent-200 hover:shadow-xl">
                        <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 transition group-hover:bg-accent-500 group-hover:text-white"><x-icon :name="$service['icon']" :size="22" /></span>
                        <h3 class="mt-4 text-lg font-bold text-slate-900">{{ $service['title'] }}</h3>
                        <p class="mt-1.5 text-sm text-slate-600">{{ $service['text'] }}</p>
                    </div>
                @endforeach
            </div>

            <div class="mt-14 grid gap-6 rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-3">
                <div class="lg:col-span-1">
                    <h3 class="text-2xl font-extrabold text-slate-900">How it works</h3>
                    <p class="mt-2 text-slate-600">Getting care started is simple.</p>
                    <div class="mt-5 flex flex-wrap gap-2">
                        <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"><x-icon name="sun" :size="14" /> Day shift</span>
                        <span class="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700"><x-icon name="moon" :size="14" /> Night shift</span>
                        <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"><x-icon name="clock" :size="14" /> 8 / 12 / 24 hours</span>
                    </div>
                </div>
                <ol class="grid gap-4 sm:grid-cols-3 lg:col-span-2">
                    @foreach ([
                        ['Tell us your needs', 'Fill the short form or call us with the patient details.'],
                        ['We match a caregiver', 'We call you, confirm the shift and send the right trained person.'],
                        ['Care begins', 'The caregiver checks in at your home and we follow up regularly.'],
                    ] as $i => [$title, $text])
                        <li class="rounded-2xl bg-slate-50 p-5">
                            <span class="bg-brand-gradient flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold text-white">{{ $i + 1 }}</span>
                            <p class="mt-3 font-bold text-slate-900">{{ $title }}</p>
                            <p class="mt-1 text-sm text-slate-600">{{ $text }}</p>
                        </li>
                    @endforeach
                </ol>
            </div>
            <div class="mt-10 text-center">
                <a href="/client" class="btn-primary px-6 py-3.5 text-base">Request home care <x-icon name="arrow-right" :size="18" /></a>
            </div>
        </div>
    </section>

    {{-- Career --}}
    <section id="career" class="py-16 sm:py-24">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
            <div class="bg-brand-gradient relative overflow-hidden rounded-[2rem] px-6 py-12 text-white shadow-2xl shadow-brand-700/25 sm:px-12 lg:py-16">
                <img src="/brand/emblem-white.png" alt="" class="pointer-events-none absolute -right-16 -top-10 w-80 opacity-10">
                <div class="relative grid gap-10 lg:grid-cols-2 lg:items-center">
                    <div>
                        <p class="text-sm font-bold uppercase tracking-wider text-white/70">Career</p>
                        <h2 class="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Join our care team</h2>
                        <p class="mt-4 text-white/85">
                            Are you a nurse, caretaker, nanny or physiotherapist? Work with families near you, choose day or night shifts, and see your duties and earnings in our staff app.
                        </p>
                        <p lang="gu" class="mt-2 font-semibold text-white/90">અમારી ટીમમાં જોડાઓ, આજે જ અરજી કરો.</p>
                        <div class="mt-6 flex flex-wrap gap-2">
                            @foreach ($roles as $role)
                                <span class="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">{{ $role }}</span>
                            @endforeach
                        </div>
                        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
                            <a href="/register" class="btn bg-white px-6 py-3.5 text-base text-brand-700 hover:bg-white/90">Apply now <x-icon name="arrow-right" :size="18" /></a>
                            <a href="/staff/login" class="btn border border-white/40 px-6 py-3.5 text-base text-white hover:bg-white/10">Staff login</a>
                        </div>
                    </div>
                    <ul class="grid gap-3 sm:grid-cols-2">
                        @foreach ([
                            ['briefcase-medical', 'Regular duties', 'Steady work with families in your city.'],
                            ['clock', 'Shifts that suit you', '8, 12 or 24 hours, day or night.'],
                            ['smartphone', 'Simple staff app', 'Start and end duty in one tap.'],
                            ['wallet', 'Clear payments', 'Payment slips for every duty you do.'],
                        ] as [$icon, $title, $text])
                            <li class="rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
                                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-accent-600"><x-icon :name="$icon" :size="20" /></span>
                                <p class="mt-3 font-bold">{{ $title }}</p>
                                <p class="mt-1 text-sm text-white/75">{{ $text }}</p>
                            </li>
                        @endforeach
                    </ul>
                </div>
            </div>
        </div>
    </section>

    {{-- Contact --}}
    <section id="contact" class="bg-slate-50 py-16 sm:py-24">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
            <div class="mx-auto max-w-2xl text-center">
                <p class="text-sm font-bold uppercase tracking-wider text-accent-600">Contact us</p>
                <h2 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">We are here to help</h2>
                <p class="mt-4 text-slate-600">Call or message us any time, or send the patient details and we will call you back.</p>
            </div>

            <div class="mt-12 grid gap-6 lg:grid-cols-5">
                <div class="grid content-start gap-4 sm:grid-cols-2 lg:col-span-3">
                    @if ($telLink)
                        <a href="{{ $telLink }}" class="card flex items-start gap-4 p-5 transition hover:shadow-lg">
                            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><x-icon name="phone" :size="22" /></span>
                            <span><span class="block text-sm font-semibold text-slate-500">Call us</span><span class="mt-0.5 block text-lg font-bold text-slate-900">{{ $phone }}</span></span>
                        </a>
                        <a href="{{ $whatsappLink }}" target="_blank" rel="noopener" class="card flex items-start gap-4 p-5 transition hover:shadow-lg">
                            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><x-icon name="message-circle" :size="22" /></span>
                            <span><span class="block text-sm font-semibold text-slate-500">WhatsApp</span><span class="mt-0.5 block text-lg font-bold text-slate-900">Chat with us</span></span>
                        </a>
                    @endif
                    @if ($email)
                        <a href="mailto:{{ $email }}" class="card flex items-start gap-4 p-5 transition hover:shadow-lg">
                            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-accent-600"><x-icon name="mail" :size="22" /></span>
                            <span class="min-w-0"><span class="block text-sm font-semibold text-slate-500">Email</span><span class="mt-0.5 block break-words text-lg font-bold text-slate-900">{{ $email }}</span></span>
                        </a>
                    @endif
                    @if ($address)
                        <a href="https://www.google.com/maps/search/?api=1&amp;query={{ rawurlencode($address) }}" target="_blank" rel="noopener" class="card flex items-start gap-4 p-5 transition hover:shadow-lg sm:col-span-2">
                            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><x-icon name="map-pin" :size="22" /></span>
                            <span><span class="block text-sm font-semibold text-slate-500">Office</span><span class="mt-0.5 block whitespace-pre-line font-bold text-slate-900">{{ $address }}</span></span>
                        </a>
                    @endif
                    <div class="card flex items-start gap-4 p-5 sm:col-span-2">
                        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><x-icon name="clock" :size="22" /></span>
                        <span><span class="block text-sm font-semibold text-slate-500">Care available</span><span class="mt-0.5 block font-bold text-slate-900">24 × 7: day and night shifts</span></span>
                    </div>
                </div>

                <div class="bg-brand-gradient relative overflow-hidden rounded-[2rem] p-8 text-white shadow-xl lg:col-span-2">
                    <img src="/brand/emblem-white.png" alt="" class="pointer-events-none absolute -bottom-8 -right-8 w-52 opacity-10">
                    <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><x-icon name="house" :size="26" /></span>
                    <h3 class="mt-5 text-2xl font-extrabold">Need care at home?</h3>
                    <p class="mt-2 text-white/85">Share the patient's details in 2 minutes. We will call you to plan the care and the right caregiver.</p>
                    <p lang="gu" class="mt-2 font-semibold text-white/90">ફોર્મ ભરો, અમે તમને ફોન કરીશું.</p>
                    <a href="/client" class="btn mt-6 w-full bg-white py-3.5 text-base text-brand-700 hover:bg-white/90">Fill the care request form <x-icon name="arrow-right" :size="18" /></a>
                </div>
            </div>
        </div>
    </section>
</main>

{{-- Footer --}}
<footer class="bg-brand-900 text-white/70">
    <div class="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
            <img src="/brand/logo-white.png" alt="{{ $name }}" class="h-12 w-auto" width="118" height="48">
            <p class="mt-4 max-w-xs text-sm">Professional nursing and patient care at home, day and night.</p>
        </div>
        <div>
            <p class="text-sm font-bold uppercase tracking-wider text-white">Quick links</p>
            <ul class="mt-3 grid grid-cols-2 gap-2 text-sm">
                @foreach ($nav as $id => $label)
                    <li><a href="#{{ $id }}" class="hover:text-white">{{ $label }}</a></li>
                @endforeach
                <li><a href="/client" class="hover:text-white">Request care</a></li>
            </ul>
        </div>
        <div>
            <p class="text-sm font-bold uppercase tracking-wider text-white">For caregivers</p>
            <ul class="mt-3 space-y-2 text-sm">
                <li><a href="/register" class="hover:text-white">Apply to join</a></li>
                <li><a href="/staff/login" class="hover:text-white">Staff login</a></li>
            </ul>
        </div>
    </div>
    <div class="border-t border-white/10 py-5 text-center text-xs">© {{ date('Y') }} {{ $name }}. All rights reserved.</div>
</footer>

@if ($whatsappLink)
    <a href="{{ $whatsappLink }}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp" class="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-xl shadow-emerald-600/30 transition hover:scale-105" style="margin-bottom: env(safe-area-inset-bottom)">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43a9.38 9.38 0 0 1 9.43 9.44c0 5.2-4.24 9.43-9.44 9.43zm8.03-17.46A11.27 11.27 0 0 0 12.05.7C5.8.7.7 5.79.7 12.05c0 2 .52 3.95 1.52 5.67L.6 23.3l5.72-1.5a11.33 11.33 0 0 0 5.72 1.46c6.25 0 11.35-5.1 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02z"/></svg>
    </a>
@endif

<script>
    (function () {
        var button = document.getElementById('menu-button');
        var menu = document.getElementById('mobile-menu');
        function setOpen(open) {
            menu.classList.toggle('hidden', !open);
            button.setAttribute('aria-expanded', String(open));
            button.querySelector('.menu-open').classList.toggle('hidden', open);
            button.querySelector('.menu-close').classList.toggle('hidden', !open);
        }
        button.addEventListener('click', function () { setOpen(menu.classList.contains('hidden')); });
        menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    })();
</script>
</body>
</html>
