import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';

export default function MainLayout() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('filter') || 'all';

  const isActive = (path: string) => location.pathname === path;

  const handleFilterChange = (newFilter: string) => {
    const params = new URLSearchParams(searchParams);
    if (newFilter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', newFilter);
    }
    setSearchParams(params);
  };

  return (
    <div className="page">
      <div className="main-layout-header">
        <div className="main-layout-header-inner">
          <div className="header-row-1">
            <h1>软考仿真机考系统</h1>
            <p>覆盖历年真题与模拟题 · 综合知识 / 案例分析 / 论文 全流程仿真</p>
          </div>
          <div className="header-row-2">
            <nav className="header-nav">
              <Link to="/" className={isActive('/') ? 'active' : ''}>
                首页
              </Link>
              <Link to="/history" className={isActive('/history') ? 'active' : ''}>
                成绩记录
              </Link>
              <Link to="/mistakes" className={isActive('/mistakes') ? 'active' : ''}>
                错题本
              </Link>
            </nav>
            <div className="header-filter">
              <span className="filter-label">类型:</span>
              <select
                value={filter}
                onChange={e => handleFilterChange(e.target.value)}
                className="filter-select"
              >
                <option value="all">全部</option>
                <option value="真题">真题</option>
                <option value="模拟题">模拟题</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
