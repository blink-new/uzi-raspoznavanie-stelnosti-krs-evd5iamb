import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// Импортируем клиент Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.1'

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

    // Инициализируем клиент Supabase
    const supabase = createClient(
      // URL и Anon Key доступны как переменные окружения в Edge Functions
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Используем Service Role Key для доступа к Storage (требуется настройка в Supabase)
      // Внимание: Service Role Key имеет полные права, используйте осторожно!
      // Для продакшена рассмотрите более гранулярные политики RLS или отдельный сервис
      { global: { headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
    )

    // Определяем путь для сохранения файла в Storage
    // Пока используем простую структуру, в будущем можно добавить ID пользователя
    const filePath = `videos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, '')}`;

    // Загружаем файл в Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('uzi-videos') // Имя вашего бакета в Supabase Storage
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Не перезаписывать файл, если он уже существует
      })

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError)
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Получаем публичный URL загруженного файла
    const publicUrlData = supabase.storage
      .from('uzi-videos')
      .getPublicUrl(filePath)

    const publicUrl = publicUrlData.publicUrl;

    console.log('File uploaded successfully:', publicUrl)

    // Здесь будет логика отправки файла в AI сервис
    // Вместо возврата информации о файле, возвращаем URL

    return new Response(JSON.stringify({
      message: 'Video uploaded and ready for analysis',
      filename: file.name,
      size: file.size,
      type: file.type,
      publicUrl: publicUrl,
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