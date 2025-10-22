import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BarChart3, X, Flame, Zap, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SimpleAnalyzerProps {
  text: string;
  onClose: () => void;
  isVisible: boolean;
}

interface RhymeAnalysis {
  rhymeDensity: {
    score: number;
    endRhymes: string[];
    internalRhymes: string[];
    multiSyllabicRhymes: string[];
  };
  flowAnalysis: {
    score: number;
    syllablePattern: number[];
    rhythmConsistency: number;
  };
  creativityAnalysis: {
    score: number;
    detectedWordplay: string[];
    detectedMetaphors: string[];
    originalityScore: number;
  };
  overallScore: number;
}

export function SimpleAnalyzer({ text, onClose, isVisible }: SimpleAnalyzerProps) {
  const [analysis, setAnalysis] = useState<RhymeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && text) {
      analyzeText();
    }
  }, [isVisible, text]);

  const analyzeText = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-void-black border border-cyber-red rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-orbitron font-bold text-cyber-red flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Rhyme Analysis
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
                data-testid="button-close-analyzer"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-cyber-red border-t-transparent rounded-full" />
                <span className="ml-3 text-gray-400">Analyzing lyrics...</span>
              </div>
            ) : analysis ? (
              <div className="space-y-6">
                {/* Overall Score - Enhanced */}
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-gradient-to-br from-secondary-dark to-gray-900 border-2 border-accent-gold shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-accent-gold flex items-center gap-2 text-xl">
                        <Star className="w-6 h-6 animate-pulse" />
                        Overall Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-5xl font-orbitron font-bold text-transparent bg-gradient-to-r from-accent-gold via-accent-red to-accent-gold bg-clip-text">
                            {analysis.overallScore}
                          </div>
                          <div className="text-gray-400 text-sm">out of 100</div>
                        </div>
                        <Badge 
                          variant={analysis.overallScore >= 80 ? "default" : analysis.overallScore >= 60 ? "secondary" : "outline"}
                          className={`px-4 py-2 text-lg ${
                            analysis.overallScore >= 80 ? "bg-accent-gold text-black" : 
                            analysis.overallScore >= 60 ? "bg-accent-blue" : 
                            "bg-gray-600"
                          }`}
                        >
                          {analysis.overallScore >= 80 ? "🔥 Elite" : 
                           analysis.overallScore >= 60 ? "💪 Strong" : 
                           analysis.overallScore >= 40 ? "👍 Decent" : 
                           "📈 Growing"}
                        </Badge>
                      </div>
                      <Progress 
                        value={analysis.overallScore} 
                        className="h-4 bg-gray-700"
                      />
                      <div className="text-xs text-gray-400 mt-2">
                        {analysis.overallScore >= 80 ? "Legendary performance! Top-tier skills displayed." : 
                         analysis.overallScore >= 60 ? "Solid delivery with room to grow." : 
                         analysis.overallScore >= 40 ? "Good start, keep practicing your craft." : 
                         "Focus on building your rhyme and flow fundamentals."}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-4">
                  {/* Rhyme Density - Enhanced */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="bg-secondary-dark border-2 border-accent-red hover:border-accent-red/70 transition-all hover:shadow-lg hover:shadow-accent-red/20">
                      <CardHeader>
                        <CardTitle className="text-accent-red flex items-center gap-2">
                          <Flame className="w-5 h-5" />
                          Rhyme Density
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-orbitron font-bold mb-2 text-white">
                          {analysis.rhymeDensity.score}
                          <span className="text-sm text-gray-400">/100</span>
                        </div>
                        <Progress 
                          value={analysis.rhymeDensity.score} 
                          className="mb-3 h-2"
                        />
                        
                        {analysis.rhymeDensity.endRhymes.length > 0 && (
                          <div className="mb-2">
                            <h4 className="font-semibold mb-1 text-sm text-gray-300">End Rhymes:</h4>
                            <div className="flex flex-wrap gap-1">
                              {analysis.rhymeDensity.endRhymes.slice(0, 4).map((rhyme, index) => (
                                <Badge key={index} variant="secondary" className="text-xs bg-accent-red/20 text-accent-red border-accent-red/30">
                                  {rhyme}
                                </Badge>
                              ))}
                              {analysis.rhymeDensity.endRhymes.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{analysis.rhymeDensity.endRhymes.length - 4} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {analysis.rhymeDensity.internalRhymes.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-1 text-sm text-gray-300">Internal Rhymes:</h4>
                            <div className="flex flex-wrap gap-1">
                              {analysis.rhymeDensity.internalRhymes.slice(0, 3).map((rhyme, index) => (
                                <Badge key={index} variant="outline" className="text-xs border-accent-red/40 text-gray-300">
                                  {rhyme}
                                </Badge>
                              ))}
                              {analysis.rhymeDensity.internalRhymes.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{analysis.rhymeDensity.internalRhymes.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Flow Analysis - Enhanced */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="bg-secondary-dark border-2 border-accent-blue hover:border-accent-blue/70 transition-all hover:shadow-lg hover:shadow-accent-blue/20">
                      <CardHeader>
                        <CardTitle className="text-accent-blue flex items-center gap-2">
                          <Zap className="w-5 h-5" />
                          Flow Quality
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-orbitron font-bold mb-2 text-white">
                          {analysis.flowAnalysis.score}
                          <span className="text-sm text-gray-400">/100</span>
                        </div>
                        <Progress 
                          value={analysis.flowAnalysis.score} 
                          className="mb-3 h-2"
                        />
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center p-2 bg-black/30 rounded">
                            <span className="text-gray-400">Rhythm:</span>
                            <span className="font-semibold text-accent-blue">{analysis.flowAnalysis.rhythmConsistency}%</span>
                          </div>
                          <div className="p-2 bg-black/30 rounded">
                            <span className="text-gray-400 block mb-1">Syllable Pattern:</span>
                            <div className="font-mono text-xs text-accent-blue">
                              {analysis.flowAnalysis.syllablePattern.join(' - ')}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Creativity - Enhanced */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="bg-secondary-dark border-2 border-accent-gold hover:border-accent-gold/70 transition-all hover:shadow-lg hover:shadow-accent-gold/20">
                      <CardHeader>
                        <CardTitle className="text-accent-gold flex items-center gap-2">
                          <Star className="w-5 h-5" />
                          Creativity
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-orbitron font-bold mb-2 text-white">
                          {analysis.creativityAnalysis.score}
                          <span className="text-sm text-gray-400">/100</span>
                        </div>
                        <Progress 
                          value={analysis.creativityAnalysis.score} 
                          className="mb-3 h-2"
                        />
                        
                        {analysis.creativityAnalysis.detectedWordplay.length > 0 && (
                          <div className="mb-2">
                            <h4 className="font-semibold mb-1 text-sm text-gray-300">Wordplay:</h4>
                            <div className="flex flex-wrap gap-1">
                              {analysis.creativityAnalysis.detectedWordplay.slice(0, 2).map((wordplay, index) => (
                                <Badge key={index} variant="secondary" className="text-xs bg-accent-gold/20 text-accent-gold border-accent-gold/30">
                                  {wordplay}
                                </Badge>
                              ))}
                              {analysis.creativityAnalysis.detectedWordplay.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{analysis.creativityAnalysis.detectedWordplay.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {analysis.creativityAnalysis.detectedMetaphors.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-1 text-sm text-gray-300">Metaphors:</h4>
                            <div className="flex flex-wrap gap-1">
                              {analysis.creativityAnalysis.detectedMetaphors.slice(0, 2).map((metaphor, index) => (
                                <Badge key={index} variant="outline" className="text-xs border-accent-gold/40 text-gray-300">
                                  {metaphor}
                                </Badge>
                              ))}
                              {analysis.creativityAnalysis.detectedMetaphors.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{analysis.creativityAnalysis.detectedMetaphors.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Original Text */}
                <Card className="bg-secondary-dark border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-gray-300">Analyzed Text</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-void-black p-4 rounded border border-gray-600 text-gray-300 whitespace-pre-wrap font-mono text-sm">
                      {text}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <BarChart3 className="w-12 h-12 opacity-50 mr-4" />
                <div>
                  <p className="text-lg">No analysis available</p>
                  <p className="text-sm">Enter some lyrics to see detailed analysis</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}