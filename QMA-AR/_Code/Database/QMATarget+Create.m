
#import "QMATarget+Create.h"


@implementation QMATarget (Create)

+ (QMATarget *)targetWithName:(NSString *)name
       inManagedObjectContext:(NSManagedObjectContext *)moc {
    
    QMATarget *target;
    
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"QMATarget"];
    request.predicate = [NSPredicate predicateWithFormat:@"name = %@", name];
    NSArray *allMatches = [moc executeFetchRequest:request error:nil];
    
    if (allMatches == nil) {
        QMALog(@"Error: Fetch request failed");
    } else if ([allMatches count] > 1) {
        QMALog(@"Error: More than one target with the same name");
    } else if ([allMatches count] == 1) {
        QMALog(@"A target with this name already exists");
        target = [allMatches firstObject];
    } else {
        //Create a new Category object
        target = [NSEntityDescription insertNewObjectForEntityForName:@"QMATarget"
                                               inManagedObjectContext:moc];
        
        target.name = name;
    }
    
    return target;
}

@end
