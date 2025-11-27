"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getWeatherData,
  getWeatherDescription,
  getRainProbability,
} from "@/lib/weather";

interface WeatherCardProps {
  lat: number;
  lon: number;
  className?: string;
}

export default function WeatherCard({ lat, lon, className }: WeatherCardProps) {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const data = await getWeatherData(lat, lon);
        setWeather(data);
      } catch (error) {
        console.error("Failed to fetch weather:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
  }, [lat, lon]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Weather Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Weather Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load weather data</p>
        </CardContent>
      </Card>
    );
  }

  const { current, daily } = weather;
  const today = daily.time[0];
  const todayIndex = daily.time.indexOf(today);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Weather Forecast</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Weather */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">
              {Math.round(current.temperature_2m)}°C
            </p>
            <p className="text-sm text-muted-foreground">
              {getWeatherDescription(current.weather_code)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm">Humidity: {current.relative_humidity_2m}%</p>
            <p className="text-sm">
              Rain: {getRainProbability(current.precipitation_probability)}
            </p>
          </div>
        </div>

        {/* Today's Forecast */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Today</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">High</p>
              <p className="font-medium">
                {Math.round(daily.temperature_2m_max[todayIndex])}°C
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Low</p>
              <p className="font-medium">
                {Math.round(daily.temperature_2m_min[todayIndex])}°C
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Rain Chance</p>
              <p className="font-medium">
                {daily.precipitation_probability[todayIndex]}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Condition</p>
              <p className="font-medium">
                {getWeatherDescription(daily.weather_code[todayIndex])}
              </p>
            </div>
          </div>
        </div>

        {/* 3-Day Forecast */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">3-Day Forecast</h4>
          <div className="space-y-2">
            {daily.time.slice(0, 3).map((date: string, index: number) => (
              <div
                key={date}
                className="flex justify-between items-center text-sm"
              >
                <span className="font-medium">
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  }).format(new Date(date))}
                </span>
                <div className="flex items-center gap-4">
                  <span>{Math.round(daily.temperature_2m_max[index])}°</span>
                  <span className="text-muted-foreground">
                    {Math.round(daily.temperature_2m_min[index])}°
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {daily.precipitation_probability[index]}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
