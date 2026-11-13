export default function Card({ title, value, subtitle, icon: Icon, trend, trendUp, className = '' }) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-soft border border-gray-100 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-xl font-semibold text-gray-900 mt-2">{value}</p>
          {subtitle && (
            <p className={`text-xs mt-1 font-light ${trendUp ? 'text-green-600' : 'text-gray-500'}`}>
              {trend && (
                <span className={`font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {trend}
                </span>
              )}
              {' '}{subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-9 h-9 bg-[#005387]/10 rounded-lg flex items-center justify-center shrink-0">
            <Icon className="w-4.5 h-4.5 text-[#005387]" />
          </div>
        )}
      </div>
    </div>
  );
}
