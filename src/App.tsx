import { useState, useRef } from 'react'
import { Upload, Play, Pause, RotateCcw, FileVideo, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Progress } from './components/ui/progress'
import { Badge } from './components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { toast } from './hooks/use-toast'

interface AnalysisResult {
  id: string
  filename: string
  timestamp: Date
  pregnant: boolean
  confidence: number
  duration: number
  frameAnalyzed: number
  videoId?: string
  // Добавляем size и type
  size: number
  type: string
}

function App() {
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null)
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const SUPABASE_FUNCTION_URL = 'https://rbqpkbojugjmgiwzefvb.supabase.co/functions/v1/upload-video'

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('video/')) {
      setSelectedVideo(file)
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      setCurrentResult(null)
    }
  }

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const resetVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const startAnalysis = async () => {
    if (!selectedVideo) {
      toast({
        title: 'Ошибка',
        description: 'Видеофайл не выбран.',
        variant: 'destructive',
      })
      return
    }

    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setCurrentResult(null)

    const formData = new FormData()
    formData.append('video', selectedVideo)

    let progress = 0
    const progressInterval = setInterval(() => {
      progress += 10
      if (progress <= 70) {
        setAnalysisProgress(progress)
      }
      if (progress >= 100) {
        clearInterval(progressInterval)
      }
    }, 150)

    try {
      const response = await fetch(SUPABASE_FUNCTION_URL, {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Ошибка сервера: ${response.status}`)
      }

      const resultData = await response.json()
      console.log('Ответ от функции:', resultData)

      setAnalysisProgress(100)

      const video_id = resultData.video_id
      const filename = resultData.filename
      const size = resultData.size
      const type = resultData.type

      const simulatedResult: AnalysisResult = {
        id: Date.now().toString(), // В будущем можно использовать video_id или analysis_id
        videoId: video_id, // Сохраняем video_id
        filename: filename || selectedVideo.name,
        timestamp: new Date(),
        pregnant: Math.random() > 0.4, // Случайный результат для демонстрации
        confidence: Math.round(80 + Math.random() * 15),
        duration: Math.round(videoRef.current?.duration || Math.random() * 30 + 10),
        frameAnalyzed: Math.round(Math.random() * 500 + 100),
        // Добавляем size и type из ответа бэкенда
        size: size,
        type: type,
      }

      setCurrentResult(simulatedResult)
      setAnalysisHistory(prev => [simulatedResult, ...prev])
      toast({
        title: 'Анализ завершен',
        description: `Файл ${simulatedResult.filename} успешно проанализирован.`,
      })

    } catch (error) {
      console.error('Ошибка при анализе видео:', error)
      clearInterval(progressInterval)
      setAnalysisProgress(0)
      toast({
        title: 'Ошибка анализа',
        description: error instanceof Error ? error.message : 'Произошла неизвестная ошибка',
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <FileVideo className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">УЗИ Анализатор</h1>
              <p className="text-sm text-gray-600">Распознавание стельности КРС</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="analysis" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="analysis">Анализ</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-8">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <span>Загрузка УЗИ видео</span>
                </CardTitle>
                <CardDescription>
                  Выберите видео файл с УЗИ исследованием для анализа стельности
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    className="hidden"
                  />
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full h-24 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                  >
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm font-medium">Выберите видео файл</p>
                      <p className="text-xs text-gray-500">MP4, AVI, MOV до 100MB</p>
                    </div>
                  </Button>

                  {selectedVideo && (
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <FileVideo className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-green-900">{selectedVideo.name}</p>
                        <p className="text-sm text-green-700">
                          Размер: {(selectedVideo.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Video Player */}
            {videoUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Предварительный просмотр</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        className="w-full h-auto"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        controls={false}
                      />
                    </div>
                    
                    <div className="flex items-center justify-center space-x-4">
                      <Button
                        onClick={togglePlayPause}
                        variant="outline"
                        size="lg"
                        className="flex items-center space-x-2"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        <span>{isPlaying ? 'Пауза' : 'Воспроизвести'}</span>
                      </Button>
                      
                      <Button
                        onClick={resetVideo}
                        variant="outline"
                        size="lg"
                        className="flex items-center space-x-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Сначала</span>
                      </Button>
                      
                      <Button
                        onClick={startAnalysis}
                        disabled={isAnalyzing}
                        size="lg"
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                      >
                        <span>{isAnalyzing ? 'Анализируем...' : 'Начать анализ'}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis Progress */}
            {isAnalyzing && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                    <span>Анализ в процессе</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress value={analysisProgress} className="w-full" />
                    <p className="text-sm text-gray-600 text-center">
                      Анализируем кадры... {Math.round(analysisProgress)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {currentResult && (
              <Card className="border-2 border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {currentResult.pregnant ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                    <span>Результат анализа</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="text-center p-6 rounded-lg bg-white">
                        <Badge
                          variant={currentResult.pregnant ? "default" : "destructive"}
                          className="text-lg px-4 py-2 mb-3"
                        >
                          {currentResult.pregnant ? "СТЕЛЬНАЯ" : "НЕ СТЕЛЬНАЯ"}
                        </Badge>
                        <p className="text-3xl font-bold text-gray-900 mb-2">
                          {currentResult.confidence}%
                        </p>
                        <p className="text-sm text-gray-600">Уверенность</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Файл:</span>
                        <span className="font-medium">{currentResult.filename}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Размер:</span>
                        <span className="font-medium">{(currentResult.size / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Тип:</span>
                        <span className="font-medium">{currentResult.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Время анализа:</span>
                        <span className="font-medium">{currentResult.duration}с</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Дата:</span>
                        <span className="font-medium">{formatDate(currentResult.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>История анализов</CardTitle>
                <CardDescription>
                  Все предыдущие результаты анализа УЗИ
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysisHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileVideo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Пока нет результатов анализа</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analysisHistory.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-4">
                          {result.pregnant ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium">{result.filename}</p>
                            <p className="text-sm text-gray-600">
                              {formatDate(result.timestamp)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(result.size / 1024 / 1024).toFixed(1)} MB, {result.type}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge
                            variant={result.pregnant ? "default" : "destructive"}
                            className="mb-1"
                          >
                            {result.pregnant ? "СТЕЛЬНАЯ" : "НЕ СТЕЛЬНАЯ"}
                          </Badge>
                          <p className="text-sm text-gray-600">
                            {result.confidence}% уверенность
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App