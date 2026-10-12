<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#24366d">
    <meta name="robots" content="noindex, nofollow">
    <title>@yield('title') · {{ $business['business_name'] }}</title>
    <meta property="og:title" content="@yield('title') · {{ $business['business_name'] }}">
    <meta property="og:description" content="@yield('summary')">
    <meta property="og:image" content="{{ url('/icons/icon-512.png') }}">
    <link rel="icon" type="image/png" href="/icons/favicon-32.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css'])
</head>
<body class="bg-slate-100 antialiased print:bg-white">
    <div class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div class="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
            <img src="/brand/emblem.png" alt="" class="h-9 w-9">
            <p class="mr-auto truncate text-sm font-bold text-slate-800">@yield('title')</p>
            <button type="button" id="share-btn" class="btn-secondary px-3 py-2">Share</button>
            <button type="button" onclick="window.print()" class="btn-primary px-3 py-2">Download PDF</button>
        </div>
    </div>

    <main class="mx-auto max-w-3xl px-3 py-5 sm:px-4 sm:py-8 print:max-w-none print:p-0">
        <div class="rounded-2xl bg-white p-5 shadow-sm sm:p-10 print:rounded-none print:p-0 print:shadow-none">
            @yield('content')
        </div>
        <p class="mt-4 text-center text-xs text-slate-400 print:hidden">Tip: "Download PDF" opens the print screen. Choose "Save as PDF".</p>
    </main>

    <script>
        document.getElementById('share-btn').addEventListener('click', async () => {
            const data = { title: document.title, text: @json(trim($__env->yieldContent('summary'))), url: location.href };
            if (navigator.share) {
                try { await navigator.share(data); } catch (e) {}
                return;
            }
            window.open('https://wa.me/?text=' + encodeURIComponent(data.text + '\n' + data.url), '_blank');
        });
    </script>
</body>
</html>
