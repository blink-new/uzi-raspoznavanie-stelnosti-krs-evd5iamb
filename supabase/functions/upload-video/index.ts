import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  // Устанавливаем CORS заголовки для всех ответов
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // В продакшене лучше указать конкретный домен фронтенда
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', // Добавляем OPTIONS
  }

  // Обработка OPTIONS запроса (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const formData = await req.formData()
    const file = formData.get('video') as File | null

    if (!file) {
      return new Response(JSON.stringify({ error: 'No video file uploaded' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Received file:', file.name, file.size, file.type)

    // Здесь будет логика сохранения файла или отправки его в AI сервис
    // Пока просто возвращаем информацию о файле

    return new Response(JSON.stringify({
      message: 'Video received successfully',
      filename: file.name,
      size: file.size,
      type: file.type,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
