import { Home, Search, Bell, User } from "lucide-react"

export default function Navigation() {
  return (
    <nav>
      <button>
        <Home size={24} />
        Home
      </button>

      <button>
        <Search size={24} />
        Search
      </button>

      <button>
        <Bell size={24} />
        Notifications
      </button>

      <button>
        <User size={24} />
        Profile
      </button>
    </nav>
  )
}