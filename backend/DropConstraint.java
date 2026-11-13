import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class DropConstraint {
    public static void main(String[] args) {
        try {
            Connection conn = DriverManager.getConnection("jdbc:postgresql://localhost:5432/test", "postgres", "2002");
            Statement stmt = conn.createStatement();
            stmt.execute("ALTER TABLE corrective_actions DROP CONSTRAINT IF EXISTS corrective_actions_status_check;");
            System.out.println("Constraint dropped successfully.");
            conn.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
