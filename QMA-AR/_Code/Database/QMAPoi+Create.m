
#import "QMAPoi+Create.h"


@implementation QMAPoi (Create)

+ (QMAPoi *)poiWithName:(NSString *)name
         andOrderNumber:(NSNumber *)order
 inManagedObjectContext:(NSManagedObjectContext *)moc {
    
    QMAPoi *poi;
    
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"QMAPoi"];
    request.predicate = [NSPredicate predicateWithFormat:@"name = %@", name];
    NSArray *allMatches = [moc executeFetchRequest:request error:nil];
    
    if (allMatches == nil) {
        QMALog(@"Error: Fetch request failed");
        poi = [allMatches firstObject];
    } else {
        //Create a new Category object
        poi = [NSEntityDescription insertNewObjectForEntityForName:@"QMAPoi"
                                               inManagedObjectContext:moc];
        
        poi.name = name;
        poi.order = order;
    }
    
    return poi;   
}

@end
